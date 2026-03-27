import { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { db } from './firebase';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  const [username, setUsername] = useState<string | null>(localStorage.getItem('edumind_user'));
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (username) {
      // Sadece onboardingCompleted alanını çekerek daha hızlı yüklenmesini sağlıyoruz
      const userRef = ref(db, `users/${username}/onboardingCompleted`);
      
      const fetchWithTimeout = Promise.race([
        get(userRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      fetchWithTimeout.then((snapshot: any) => {
        if (snapshot.exists()) {
          setOnboardingCompleted(snapshot.val());
        } else {
          // Eğer onboardingCompleted yoksa, kullanıcının kendisi var mı diye kontrol et
          const fullUserRef = ref(db, `users/${username}`);
          return get(fullUserRef).then(fullSnap => {
            if (fullSnap.exists()) {
              setOnboardingCompleted(false);
            } else {
              localStorage.removeItem('edumind_user');
              setUsername(null);
            }
          });
        }
      })
      .then(() => setLoading(false))
      .catch(error => {
        console.error("Error fetching user data:", error);
        // Hata durumunda (örneğin timeout) kullanıcıyı içeride tutma, çıkış yaptır
        // Çünkü veritabanı bağlantısı yoksa uygulama çalışmaz
        localStorage.removeItem('edumind_user');
        setUsername(null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-500 font-medium animate-pulse">Bağlanıyor...</p>
      </div>
    );
  }

  if (!username) {
    return <AuthPage onLogin={(user) => setUsername(user)} />;
  }

  if (onboardingCompleted === false) {
    return <OnboardingPage username={username} onComplete={() => setOnboardingCompleted(true)} />;
  }

  return <DashboardPage username={username} onLogout={() => {
    localStorage.removeItem('edumind_user');
    setUsername(null);
  }} />;
}
