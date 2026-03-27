import React, { useState } from 'react';
import { ref, get, set } from 'firebase/database';
import { db } from '../firebase';
import { BookOpen, ArrowRight, UserCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function AuthPage({ onLogin }: { onLogin: (username: string) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanUsername = username.trim();
    
    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Kullanıcı adı en az 3 karakter olmalıdır.');
      return;
    }
    
    if (/[.#$\[\]]/.test(cleanUsername)) {
      setError('Kullanıcı adı geçersiz karakterler içeriyor (., #, $, [, ] kullanılamaz).');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const userRef = ref(db, `users/${cleanUsername}`);
      
      // 5 saniyelik zaman aşımı kontrolü (Yükleniyor sorununu çözmek için)
      const snapshot: any = await Promise.race([
        get(userRef),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Bağlantı zaman aşımına uğradı. Lütfen Firebase Console üzerinden "Realtime Database" oluşturduğunuzdan ve kurallarını (Rules) "true" yaptığınızdan emin olun. Ayrıca projeniz Avrupa bölgesindeyse databaseURL ayarını kontrol edin.')), 5000)
        )
      ]);
      
      if (isLogin) {
        if (!snapshot.exists()) {
          setError('Kullanıcı bulunamadı.');
        } else if (snapshot.val().password !== password) {
          setError('Hatalı şifre.');
        } else {
          localStorage.setItem('edumind_user', cleanUsername);
          onLogin(cleanUsername);
        }
      } else {
        if (snapshot.exists()) {
          setError('Bu kullanıcı adı zaten alınmış.');
        } else {
          await set(userRef, {
            password,
            createdAt: Date.now(),
            onboardingCompleted: false
          });
          localStorage.setItem('edumind_user', cleanUsername);
          onLogin(cleanUsername);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousAuth = async () => {
    setError('');
    setLoading(true);
    
    try {
      const anonUsername = `anon_${Math.floor(Math.random() * 10000000)}`;
      const userRef = ref(db, `users/${anonUsername}`);
      
      const setPromise = set(userRef, {
        isAnonymous: true,
        createdAt: Date.now(),
        onboardingCompleted: false
      });

      await Promise.race([
        setPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Bağlantı zaman aşımına uğradı. Lütfen Firebase Console üzerinden "Realtime Database" oluşturduğunuzdan ve kurallarını (Rules) "true" yaptığınızdan emin olun. Ayrıca projeniz Avrupa bölgesindeyse databaseURL ayarını kontrol edin.')), 5000)
        )
      ]);

      localStorage.setItem('edumind_user', anonUsername);
      onLogin(anonUsername);
    } catch (err: any) {
      setError(err.message || 'Anonim giriş başarısız.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] text-gray-900 p-4 relative overflow-hidden">
      {/* Subtle background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[120px] rounded-full mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-violet-500/10 blur-[120px] rounded-full mix-blend-multiply pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 p-10 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="text-center mb-10">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="mx-auto h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-indigo-100"
            >
              <BookOpen className="h-8 w-8 text-indigo-600" />
            </motion.div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              EduMind
            </h2>
            <p className="mt-3 text-sm text-gray-500 font-medium">
              {isLogin ? 'Hesabınıza giriş yapın' : 'Yeni bir hesap oluşturun'}
            </p>
          </div>
          
          <form className="space-y-5" onSubmit={handleAuth}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">Kullanıcı Adı</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium placeholder:text-gray-400"
                  placeholder="Kullanıcı adınız"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">Şifre</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium placeholder:text-gray-400"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-xl border border-red-100"
              >
                {error}
              </motion.div>
            )}

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-400 font-medium">veya</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAnonymousAuth}
                disabled={loading}
                className="group relative w-full flex justify-center items-center py-3.5 px-4 border border-gray-200 text-sm font-semibold rounded-2xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 disabled:opacity-50 transition-all"
              >
                <UserCircle2 className="mr-2 w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                Anonim Olarak Devam Et
              </button>
            </div>
          </form>

          <div className="text-center mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors flex items-center justify-center w-full"
            >
              {isLogin ? (
                <>Hesabınız yok mu? <span className="ml-1 text-indigo-600 font-semibold">Kayıt olun</span></>
              ) : (
                <>Zaten hesabınız var mı? <span className="ml-1 text-indigo-600 font-semibold">Giriş yapın</span></>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
