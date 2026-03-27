import { useState } from 'react';
import { db } from '../firebase';
import { ref, update, push } from 'firebase/database';
import { addDays, format } from 'date-fns';
import { Book, Calendar, CheckCircle, Plus, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BookInput {
  id: string;
  title: string;
  totalPages: number;
  targetDays: number;
}

interface LessonInput {
  id: string;
  title: string;
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
}

const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export default function OnboardingPage({ username, onComplete }: { username: string, onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [books, setBooks] = useState<BookInput[]>([]);
  const [lessons, setLessons] = useState<LessonInput[]>([]);
  const [loading, setLoading] = useState(false);

  // Book Form State
  const [bookTitle, setBookTitle] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [targetDays, setTargetDays] = useState('');

  // Lesson Form State
  const [lessonTitle, setLessonTitle] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const handleAddBook = () => {
    if (!bookTitle || !totalPages || !targetDays) return;
    setBooks([
      ...books,
      {
        id: Date.now().toString(),
        title: bookTitle,
        totalPages: parseInt(totalPages),
        targetDays: parseInt(targetDays),
      },
    ]);
    setBookTitle('');
    setTotalPages('');
    setTargetDays('');
  };

  const handleAddLesson = () => {
    if (!lessonTitle || selectedDays.length === 0) return;
    setLessons([
      ...lessons,
      {
        id: Date.now().toString(),
        title: lessonTitle,
        daysOfWeek: selectedDays,
      },
    ]);
    setLessonTitle('');
    setSelectedDays([]);
  };

  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex]);
    }
  };

  const handleComplete = async () => {
    if (!username) return;
    setLoading(true);
    
    try {
      const updates: any = {};
      
      // 1. Update User Profile
      updates[`users/${username}/onboardingCompleted`] = true;

      // 2. Generate Tasks
      const today = new Date();

      // Generate Book Tasks
      books.forEach((book) => {
        const pagesPerDay = Math.ceil(book.totalPages / book.targetDays);
        let remainingPages = book.totalPages;
        
        for (let i = 0; i < book.targetDays; i++) {
          const taskDate = addDays(today, i);
          const dateStr = format(taskDate, 'yyyy-MM-dd');
          const pagesForThisDay = Math.min(pagesPerDay, remainingPages);
          if (pagesForThisDay <= 0) break;
          
          const taskId = push(ref(db, `users/${username}/tasks/${dateStr}`)).key;
          updates[`users/${username}/tasks/${dateStr}/${taskId}`] = {
            title: `${book.title} Okuması`,
            type: 'book',
            date: dateStr,
            completed: false,
            pagesToRead: pagesForThisDay,
            bookName: book.title,
            createdAt: Date.now()
          };
          
          remainingPages -= pagesForThisDay;
        }
      });

      // Generate Lesson Tasks for the next 30 days
      for (let i = 0; i < 30; i++) {
        const taskDate = addDays(today, i);
        const dateStr = format(taskDate, 'yyyy-MM-dd');
        const dayOfWeek = taskDate.getDay();
        
        lessons.forEach((lesson) => {
          if (lesson.daysOfWeek.includes(dayOfWeek)) {
            const taskId = push(ref(db, `users/${username}/tasks/${dateStr}`)).key;
            updates[`users/${username}/tasks/${dateStr}/${taskId}`] = {
              title: `${lesson.title} Çalışması`,
              type: 'lesson',
              date: dateStr,
              completed: false,
              createdAt: Date.now()
            };
          }
        });
      }

      await update(ref(db), updates);
      onComplete();
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl w-full bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden"
      >
        <div className="px-8 py-8 border-b border-gray-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Ders Programı Kurulumu</h2>
            <p className="text-sm text-gray-500 mt-1">Hedeflerinizi belirleyin, planınızı oluşturalım.</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-200'} transition-colors duration-300`} />
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'} transition-colors duration-300`} />
          </div>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="flex items-center space-x-4 text-gray-900">
                  <div className="p-3 bg-indigo-50 rounded-2xl">
                    <Calendar className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-semibold">Ders Programınızı Ekleyin</h3>
                </div>
                
                <div className="bg-gray-50/50 p-6 rounded-[24px] border border-gray-100 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">Ders Adı</label>
                    <input
                      type="text"
                      placeholder="örn: Matematik"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 ml-1">Hangi Günler?</label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((day, index) => (
                        <button
                          key={day}
                          onClick={() => toggleDay(index)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            selectedDays.includes(index)
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleAddLesson}
                    className="flex items-center justify-center w-full py-3 px-4 rounded-2xl text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Dersi Ekle
                  </button>
                </div>

                {lessons.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Eklenen Dersler</h4>
                    <div className="space-y-2">
                      {lessons.map((lesson) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={lesson.id} 
                          className="flex items-center justify-between bg-white p-4 border border-gray-100 rounded-2xl shadow-sm"
                        >
                          <div>
                            <span className="font-semibold text-gray-900">{lesson.title}</span>
                            <p className="text-xs text-gray-500 mt-1 font-medium">
                              {lesson.daysOfWeek.map(d => DAYS[d]).join(', ')}
                            </p>
                          </div>
                          <button 
                            onClick={() => setLessons(lessons.filter(l => l.id !== lesson.id))}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    className="flex items-center py-3 px-8 rounded-2xl shadow-md text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-all hover:shadow-lg hover:-translate-y-0.5"
                  >
                    İleri <ArrowRight className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="flex items-center space-x-4 text-gray-900">
                  <div className="p-3 bg-indigo-50 rounded-2xl">
                    <Book className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-semibold">Okunacak Kitapları Ekleyin</h3>
                </div>
                
                <div className="bg-gray-50/50 p-6 rounded-[24px] border border-gray-100 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">Kitap Adı</label>
                    <input
                      type="text"
                      placeholder="örn: Fizik Soru Bankası"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">Toplam Sayfa</label>
                      <input
                        type="number"
                        placeholder="Örn: 300"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                        value={totalPages}
                        onChange={(e) => setTotalPages(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">Hedef Gün</label>
                      <input
                        type="number"
                        placeholder="Örn: 30"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                        value={targetDays}
                        onChange={(e) => setTargetDays(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={handleAddBook}
                    className="flex items-center justify-center w-full py-3 px-4 rounded-2xl text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Kitabı Ekle
                  </button>
                </div>

                {books.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Eklenen Kitaplar</h4>
                    <div className="space-y-2">
                      {books.map((book) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={book.id} 
                          className="flex items-center justify-between bg-white p-4 border border-gray-100 rounded-2xl shadow-sm"
                        >
                          <div>
                            <span className="font-semibold text-gray-900">{book.title}</span>
                            <p className="text-xs text-gray-500 mt-1 font-medium">
                              {book.totalPages} sayfa, {book.targetDays} günde ({Math.ceil(book.totalPages / book.targetDays)} sayfa/gün)
                            </p>
                          </div>
                          <button 
                            onClick={() => setBooks(books.filter(b => b.id !== book.id))}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-between items-center">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center py-3 px-6 rounded-2xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <ArrowLeft className="mr-2 w-4 h-4" /> Geri
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={loading}
                    className="flex items-center py-3 px-8 rounded-2xl shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all hover:shadow-lg hover:-translate-y-0.5"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" /> Planı Oluştur
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
