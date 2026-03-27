import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { ref as dbRef, onValue, update, push, set, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { format, addDays, subDays, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CheckCircle, Circle, ChevronLeft, ChevronRight, LogOut, BookOpen, Calendar as CalendarIcon, Sparkles, Bot, Home, FileText, BookMarked, Plus, Upload, File, Image as ImageIcon, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from '@google/genai';
import imageCompression from 'browser-image-compression';

interface Task {
  id: string;
  title: string;
  type: 'lesson' | 'book' | 'homework';
  date: string;
  completed: boolean;
  pagesToRead?: number;
  bookName?: string;
  description?: string;
}

export default function DashboardPage({ username, onLogout }: { username: string, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'homework' | 'schedule'>('home');
  
  // Home Tab State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyTasks, setDailyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Global Tasks State (for Calendar and Homework)
  const [allTasks, setAllTasks] = useState<Record<string, Record<string, Task>>>({});

  // Schedule State
  const [lastUploadAt, setLastUploadAt] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Homework State
  const [hwTitle, setHwTitle] = useState('');
  const [hwDate, setHwDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hwDesc, setHwDesc] = useState('');
  const [showHwForm, setShowHwForm] = useState(false);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch Daily Tasks
  useEffect(() => {
    if (!username) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const tasksRef = dbRef(db, `users/${username}/tasks/${dateStr}`);

    const unsubscribe = onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      const fetchedTasks: Task[] = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      
      fetchedTasks.sort((a, b) => {
        if (a.completed === b.completed) return a.type.localeCompare(b.type);
        return a.completed ? 1 : -1;
      });
      
      setDailyTasks(fetchedTasks);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate, username]);

  // Fetch All Tasks & Schedule
  useEffect(() => {
    if (!username) return;
    const allTasksRef = dbRef(db, `users/${username}/tasks`);
    const unsubAll = onValue(allTasksRef, (snapshot) => {
      if (snapshot.exists()) {
        setAllTasks(snapshot.val());
      } else {
        setAllTasks({});
      }
    });

    get(dbRef(db, `users/${username}/scheduleInfo`)).then(snap => {
      if (snap.exists()) {
        setLastUploadAt(snap.val().lastUploadAt);
      }
    });

    return () => unsubAll();
  }, [username]);

  const toggleTask = async (task: Task, dateStr: string = format(selectedDate, 'yyyy-MM-dd')) => {
    if (!username) return;
    try {
      const taskRef = dbRef(db, `users/${username}/tasks/${dateStr}/${task.id}`);
      await update(taskRef, { completed: !task.completed });
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const getAITip = async () => {
    if (dailyTasks.length === 0) return;
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const taskListStr = dailyTasks.map(t => `- ${t.title} (${t.completed ? 'Tamamlandı' : 'Bekliyor'})`).join('\n');
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Benim adım ${username}. Bugünkü görevlerim şunlar:\n${taskListStr}\n\nBana bu görevlerime bakarak kısa, 2 cümlelik motive edici ve akıllıca bir çalışma tavsiyesi ver. Türkçe konuş. Samimi ve enerjik bir dil kullan.`,
      });
      
      setAiTip(response.text || 'Harika gidiyorsun! Çalışmaya devam et.');
    } catch (error) {
      console.error("AI Error:", error);
      setAiTip("Bugün harika işler başaracaksın! Odaklan ve adım adım ilerle.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle || !hwDate) return;
    
    try {
      const taskId = push(dbRef(db, `users/${username}/tasks/${hwDate}`)).key;
      await update(dbRef(db, `users/${username}/tasks/${hwDate}/${taskId}`), {
        title: hwTitle,
        type: 'homework',
        date: hwDate,
        description: hwDesc,
        completed: false,
        createdAt: Date.now()
      });
      setHwTitle('');
      setHwDesc('');
      setShowHwForm(false);
    } catch (error) {
      console.error("Error adding homework:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !username) return;
    
    // Check 10-day cooldown
    if (lastUploadAt && Date.now() - lastUploadAt < 10 * 24 * 60 * 60 * 1000) {
      const daysLeft = Math.ceil((10 * 24 * 60 * 60 * 1000 - (Date.now() - lastUploadAt)) / (1000 * 60 * 60 * 24));
      alert(`Yeni bir program yüklemek için ${daysLeft} gün beklemelisiniz.`);
      return;
    }

    setUploading(true);
    setAnalyzing(true);
    
    try {
      const isImage = file.type.startsWith('image/');
      let fileToUpload = file;
      let base64Data = "";

      // Compress image before upload (more aggressive for speed)
      if (isImage) {
        const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1024, useWebWorker: true };
        fileToUpload = await imageCompression(file, options);
      }

      // Convert to base64 for AI analysis
      const reader = new FileReader();
      reader.readAsDataURL(fileToUpload);
      await new Promise(resolve => reader.onload = resolve);
      base64Data = (reader.result as string).split(',')[1];

      // AI Analysis Task (No storage upload)
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: fileToUpload.type || 'text/plain'
            }
          },
          "Analyze this school schedule (Turkish or English). Extract lessons and days. Fast JSON output only. Example: {\"lessons\":[{\"title\":\"Math\",\"daysOfWeek\":[1,3]}]}. Days: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat. Expand abbreviations (e.g., MAT->Matematik, ENG->English)."
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lessons: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    daysOfWeek: { type: Type.ARRAY, items: { type: Type.INTEGER } }
                  }
                }
              }
            }
          }
        }
      });
      
      const aiResult = JSON.parse(response.text || "{}");

      // Generate tasks for the next 30 days based on extracted lessons
      if (aiResult && aiResult.lessons && aiResult.lessons.length > 0) {
        const extractedLessons = aiResult.lessons;
        const updates: any = {};
        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const taskDate = addDays(today, i);
          const dateStr = format(taskDate, 'yyyy-MM-dd');
          const dayOfWeek = taskDate.getDay();

          extractedLessons.forEach((lesson: any) => {
            if (lesson && lesson.daysOfWeek && Array.isArray(lesson.daysOfWeek) && lesson.daysOfWeek.includes(dayOfWeek)) {
              const taskId = push(dbRef(db, `users/${username}/tasks/${dateStr}`)).key;
              updates[`users/${username}/tasks/${dateStr}/${taskId}`] = {
                title: `${lesson.title} Dersi`,
                type: 'lesson',
                date: dateStr,
                completed: false,
                createdAt: Date.now()
              };
            }
          });
        }
        await update(dbRef(db), updates);
        
        // Save metadata to DB (only lastUploadAt, no file URL)
        const now = Date.now();
        await set(dbRef(db, `users/${username}/scheduleInfo`), { lastUploadAt: now });
        setLastUploadAt(now);
        
        alert("Ders programı başarıyla analiz edildi ve takviminize eklendi!");
      } else {
        alert("Program analiz edilemedi. Lütfen daha net bir dosya yükleyin.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Analiz sırasında bir hata oluştu: " + err.message);
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!username) return;
    const confirmDelete = window.confirm("Mevcut ders programını sıfırlamak istediğinize emin misiniz? (Yeni program eklemek için son yüklemeden itibaren 10 gün geçmiş olması gerekir)");
    if (!confirmDelete) return;
    
    try {
      await set(dbRef(db, `users/${username}/scheduleInfo`), null);
      setLastUploadAt(null);
    } catch (error) {
      console.error("Error deleting schedule:", error);
    }
  };

  // Render Helpers
  const renderHomeTab = () => {
    const completedCount = dailyTasks.filter(t => t.completed).length;
    const progress = dailyTasks.length === 0 ? 0 : Math.round((completedCount / dailyTasks.length) * 100);

    return (
      <div className="space-y-6">
        {/* Top Section: Date & Progress */}
        <div className="grid grid-cols-1 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-100 flex flex-col justify-center items-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="flex items-center justify-between w-full">
              <button onClick={() => { setSelectedDate(subDays(selectedDate, 1)); setAiTip(null); }} className="p-2 rounded-full hover:bg-gray-50 text-gray-400">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex flex-col items-center text-center">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
                  {isSameDay(selectedDate, new Date()) ? 'Bugün' : format(selectedDate, 'EEEE', { locale: tr })}
                </span>
                <span className="text-xl font-bold text-gray-900 tracking-tight">
                  {format(selectedDate, 'd MMM', { locale: tr })}
                </span>
              </div>
              <button onClick={() => { setSelectedDate(addDays(selectedDate, 1)); setAiTip(null); }} className="p-2 rounded-full hover:bg-gray-50 text-gray-400">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden"
          >
            <div className="flex justify-between items-end mb-3 relative z-10">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">İlerleme</h3>
                <div className="flex items-baseline space-x-2 mt-1">
                  <p className="text-3xl font-bold text-gray-900 tracking-tighter">{progress}%</p>
                  {progress === 100 && <Sparkles className="w-4 h-4 text-yellow-500" />}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
                  {completedCount} / {dailyTasks.length} Görev
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden relative z-10">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, type: "spring", bounce: 0.2 }}
                className={`h-full rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-indigo-600'}`}
              />
            </div>
          </motion.div>
        </div>

        {/* AI Coach Section */}
        {dailyTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-[28px] p-5 border border-indigo-100/50 shadow-sm relative overflow-hidden"
          >
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between relative z-10 mb-3">
              <div className="flex items-center space-x-3">
                <div className="bg-white p-2.5 rounded-xl shadow-sm border border-indigo-100">
                  <Bot className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight">Yapay Zeka Koçu</h3>
              </div>
              {!aiTip && (
                <button onClick={getAITip} disabled={aiLoading} className="flex items-center px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50">
                  {aiLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" /> : <Sparkles className="w-3 h-3 mr-1.5" />}
                  Tavsiye
                </button>
              )}
            </div>
            <AnimatePresence>
              {aiTip && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-indigo-100 text-gray-800 text-sm font-medium leading-relaxed shadow-sm">
                  {aiTip}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Tasks List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[28px] shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center tracking-tight">
              <CalendarIcon className="w-4 h-4 mr-2 text-indigo-500" />
              Görevler
            </h2>
          </div>
          
          {loading ? (
            <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>
          ) : dailyTasks.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-lg font-bold text-gray-900 tracking-tight">Görev yok!</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">Dinlenmek için harika bir gün.</p>
            </div>
          ) : (
            <ul className="p-3 space-y-2">
              <AnimatePresence>
                {dailyTasks.map((task) => (
                  <motion.li 
                    layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    key={task.id} 
                    className={`group p-4 rounded-2xl transition-all cursor-pointer border ${task.completed ? 'bg-gray-50/50 border-transparent opacity-60' : 'bg-white border-gray-100 hover:border-indigo-200 shadow-sm'}`}
                    onClick={() => toggleTask(task)}
                  >
                    <div className="flex items-start">
                      <button className="flex-shrink-0 mr-3 mt-0.5 focus:outline-none transition-transform group-hover:scale-110">
                        {task.completed ? <CheckCircle className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6 text-gray-300 group-hover:text-indigo-400" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold tracking-tight ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{task.title}</p>
                        {task.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>}
                        <div className="flex items-center mt-2 space-x-2 flex-wrap gap-y-2">
                          {task.type === 'book' && task.pagesToRead && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${task.completed ? 'bg-gray-100 text-gray-500' : 'bg-indigo-50 text-indigo-700'}`}>Hedef: {task.pagesToRead} sayfa</span>
                          )}
                          {task.type === 'lesson' && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${task.completed ? 'bg-gray-100 text-gray-500' : 'bg-orange-50 text-orange-700'}`}>Ders</span>
                          )}
                          {task.type === 'homework' && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${task.completed ? 'bg-gray-100 text-gray-500' : 'bg-rose-50 text-rose-700'}`}>Ödev</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </motion.div>
      </div>
    );
  };

  const renderCalendarTab = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    return (
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setCurrentMonth(subDays(monthStart, 1))} className="p-2 rounded-full hover:bg-gray-50 text-gray-400"><ChevronLeft className="w-5 h-5" /></button>
            <h2 className="text-lg font-bold text-gray-900">{format(currentMonth, 'MMMM yyyy', { locale: tr })}</h2>
            <button onClick={() => setCurrentMonth(addDays(monthEnd, 1))} className="p-2 rounded-full hover:bg-gray-50 text-gray-400"><ChevronRight className="w-5 h-5" /></button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-gray-400 uppercase">{day}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayTasks = allTasks[dateStr] ? (Object.values(allTasks[dateStr]) as Task[]) : [];
              const hasLesson = dayTasks.some(t => t.type === 'lesson');
              const hasHomework = dayTasks.some(t => t.type === 'homework');
              const isSelected = isSameDay(day, selectedDate);
              
              return (
                <div 
                  key={i} 
                  onClick={() => { setSelectedDate(day); setActiveTab('home'); }}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all relative ${!isSameMonth(day, monthStart) ? 'text-gray-300' : 'text-gray-700'} ${isSelected ? 'bg-indigo-600 text-white font-bold shadow-md' : 'hover:bg-gray-50'} ${isToday(day) && !isSelected ? 'border border-indigo-200 text-indigo-600 font-bold' : ''}`}
                >
                  <span className="text-sm">{format(day, dateFormat)}</span>
                  <div className="flex gap-0.5 mt-1 absolute bottom-1.5">
                    {hasLesson && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-orange-400'}`} />}
                    {hasHomework && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-rose-400'}`} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Renk Kodları</h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center text-xs text-gray-600"><div className="w-2 h-2 rounded-full bg-orange-400 mr-2" /> Ders Çalışması</div>
            <div className="flex items-center text-xs text-gray-600"><div className="w-2 h-2 rounded-full bg-rose-400 mr-2" /> Ödev</div>
          </div>
        </div>
      </div>
    );
  };

  const renderHomeworkTab = () => {
    // Extract all homeworks
    const allHw: Task[] = [];
    Object.keys(allTasks).forEach(dateStr => {
      (Object.values(allTasks[dateStr]) as Task[]).forEach(task => {
        if (task.type === 'homework') {
          allHw.push({ ...task, date: dateStr });
        }
      });
    });
    
    // Sort by date ascending
    allHw.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const pendingHw = allHw.filter(t => !t.completed);
    const completedHw = allHw.filter(t => t.completed);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Ödevler</h2>
          <button 
            onClick={() => setShowHwForm(!showHwForm)}
            className="flex items-center px-3 py-2 bg-indigo-50 text-indigo-600 text-sm font-semibold rounded-xl hover:bg-indigo-100 transition-colors"
          >
            {showHwForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {showHwForm ? 'İptal' : 'Yeni Ödev'}
          </button>
        </div>

        <AnimatePresence>
          {showHwForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <form onSubmit={handleAddHomework} className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-100 space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Ödev Başlığı</label>
                  <input type="text" required value={hwTitle} onChange={e => setHwTitle(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm" placeholder="Matematik Testi Çözülecek" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Son Teslim Tarihi</label>
                  <input type="date" required value={hwDate} onChange={e => setHwDate(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Açıklama (İsteğe Bağlı)</label>
                  <textarea value={hwDesc} onChange={e => setHwDesc(e.target.value)} rows={2} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm" placeholder="Sayfa 45-50 arası..." />
                </div>
                <button type="submit" className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-md hover:bg-indigo-700 transition-colors">Ödevi Ekle</button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Bekleyen Ödevler ({pendingHw.length})</h3>
          {pendingHw.length === 0 ? (
            <div className="bg-white p-8 rounded-[28px] border border-gray-100 text-center text-gray-500 text-sm">Bekleyen ödeviniz yok. Harika!</div>
          ) : (
            <div className="space-y-3">
              {pendingHw.map(hw => (
                <div key={hw.id} className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex items-start">
                  <button onClick={() => toggleTask(hw, hw.date)} className="mt-0.5 mr-3"><Circle className="w-6 h-6 text-gray-300 hover:text-rose-400" /></button>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{hw.title}</h4>
                    {hw.description && <p className="text-xs text-gray-600 mt-1">{hw.description}</p>}
                    <div className="mt-2 inline-flex items-center px-2 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-md">Son: {format(parseISO(hw.date), 'd MMM yyyy', { locale: tr })}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {completedHw.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Tamamlananlar</h3>
            <div className="space-y-3 opacity-60">
              {completedHw.map(hw => (
                <div key={hw.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start">
                  <button onClick={() => toggleTask(hw, hw.date)} className="mt-0.5 mr-3"><CheckCircle className="w-6 h-6 text-green-500" /></button>
                  <div>
                    <h4 className="text-sm font-bold text-gray-500 line-through">{hw.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderScheduleTab = () => {
    const isOnCooldown = lastUploadAt && (Date.now() - lastUploadAt < 10 * 24 * 60 * 60 * 1000);
    const daysLeft = isOnCooldown ? Math.ceil((10 * 24 * 60 * 60 * 1000 - (Date.now() - lastUploadAt!)) / (1000 * 60 * 60 * 24)) : 0;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Ders Programı</h2>
        </div>

        <div className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100">
          {lastUploadAt ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-600">Mevcut Program Durumu</span>
                <button onClick={handleDeleteSchedule} className="flex items-center px-3 py-1.5 bg-rose-50 text-rose-600 text-xs font-semibold rounded-lg hover:bg-rose-100 transition-colors">
                  <Trash2 className="w-3 h-3 mr-1.5" /> Programı Sıfırla
                </button>
              </div>
              
              <div className="flex flex-col items-center justify-center p-8 bg-green-50 rounded-xl border border-green-200 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                <p className="text-sm font-bold text-green-800 mb-1">Program Analiz Edildi</p>
                <p className="text-xs font-medium text-green-600 mb-4">Dersleriniz takviminize başarıyla işlendi.</p>
                
                {isOnCooldown && (
                  <div className="bg-white/60 px-4 py-2 rounded-lg text-xs text-green-700 font-medium">
                    Yeni bir program yüklemek için <b>{daysLeft} gün</b> beklemelisiniz.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Yapay Zeka ile Analiz</h3>
              
              {isOnCooldown ? (
                <div className="bg-orange-50 text-orange-700 p-4 rounded-xl text-sm font-medium mt-4">
                  Yeni bir ders programı yüklemek için <b>{daysLeft} gün</b> beklemelisiniz. (10 günde bir değiştirilebilir)
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-6">Ders programınızı yükleyin, yapay zeka saniyeler içinde analiz edip dersleri takviminize otomatik eklesin. (Dosyanız hiçbir yere kaydedilmez, sadece analiz edilir.)</p>
                  <label className="cursor-pointer inline-flex items-center px-5 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-md hover:bg-indigo-700 transition-all">
                    {uploading ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Analiz Ediliyor...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> Program Seç ve Analiz Et</>
                    )}
                    <input type="file" accept="*/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 font-sans selection:bg-indigo-100 pb-24">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-sm shadow-indigo-200">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">EduMind</h1>
          </div>
          <button onClick={onLogout} className="flex items-center p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {activeTab === 'home' && renderHomeTab()}
            {activeTab === 'calendar' && renderCalendarTab()}
            {activeTab === 'homework' && renderHomeworkTab()}
            {activeTab === 'schedule' && renderScheduleTab()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-100 pb-safe z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <div className="max-w-md mx-auto flex justify-around items-center p-2">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center p-2 rounded-xl min-w-[64px] transition-colors ${activeTab === 'home' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <div className={`p-1.5 rounded-lg mb-1 ${activeTab === 'home' ? 'bg-indigo-50' : ''}`}><Home className="w-5 h-5" /></div>
            <span className="text-[10px] font-bold">Ana Sayfa</span>
          </button>
          <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center p-2 rounded-xl min-w-[64px] transition-colors ${activeTab === 'calendar' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <div className={`p-1.5 rounded-lg mb-1 ${activeTab === 'calendar' ? 'bg-indigo-50' : ''}`}><CalendarIcon className="w-5 h-5" /></div>
            <span className="text-[10px] font-bold">Takvim</span>
          </button>
          <button onClick={() => setActiveTab('homework')} className={`flex flex-col items-center p-2 rounded-xl min-w-[64px] transition-colors ${activeTab === 'homework' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <div className={`p-1.5 rounded-lg mb-1 ${activeTab === 'homework' ? 'bg-indigo-50' : ''}`}><BookMarked className="w-5 h-5" /></div>
            <span className="text-[10px] font-bold">Ödevler</span>
          </button>
          <button onClick={() => setActiveTab('schedule')} className={`flex flex-col items-center p-2 rounded-xl min-w-[64px] transition-colors ${activeTab === 'schedule' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <div className={`p-1.5 rounded-lg mb-1 ${activeTab === 'schedule' ? 'bg-indigo-50' : ''}`}><FileText className="w-5 h-5" /></div>
            <span className="text-[10px] font-bold">Program</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
