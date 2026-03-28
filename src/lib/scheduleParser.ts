export function parseScheduleFromText(text: string, wordsData?: any[]) {
  const dayMap: Record<string, number> = {
    'pazartesi': 1, 'pzt': 1, 'pa': 1, 'ptesi': 1, 'ptes': 1, 'pazartes': 1, 'pazart': 1,
    'salı': 2, 'sali': 2, 'sa': 2, 'sl': 2, 'sal': 2,
    'çarşamba': 3, 'carsamba': 3, 'çar': 3, 'ça': 3, 'çrş': 3, 'crs': 3, 'çarşamb': 3, 'carsamb': 3, 'çarş': 3, 'cars': 3,
    'perşembe': 4, 'persembe': 4, 'per': 4, 'pe': 4, 'prş': 4, 'prs': 4, 'perşemb': 4, 'persemb': 4, 'perş': 4, 'pers': 4,
    'cuma': 5, 'cum': 5, 'cu': 5,
    'cumartesi': 6, 'cmt': 6, 'ct': 6, 'ctesi': 6, 'ctes': 6, 'cumartes': 6, 'cumart': 6,
    'pazar': 0, 'paz': 0, 'pz': 0
  };

  const exactSubjectMap: Record<string, string> = {
    // Matematik
    'mat': 'Matematik', 'matematik': 'Matematik', 'mt': 'Matematik', 'mte': 'Matematik', 'matm': 'Matematik',
    'hsmat': 'Matematik (Kurs)', 'em7': 'Matematik (Etüt)', 'em8': 'Matematik (Etüt)', 'em6': 'Matematik (Etüt)', 'em5': 'Matematik (Etüt)',
    
    // Fen Bilimleri
    'fb': 'Fen Bilimleri', 'fen': 'Fen Bilimleri', 'fenbil': 'Fen Bilimleri', 'fenbilimleri': 'Fen Bilimleri', 'fnb': 'Fen Bilimleri',
    'hfb': 'Fen Bilimleri (Kurs)', 'ef7': 'Fen Bilimleri (Etüt)', 'ef8': 'Fen Bilimleri (Etüt)', 'ef6': 'Fen Bilimleri (Etüt)', 'ef5': 'Fen Bilimleri (Etüt)',
    
    // Türkçe / Edebiyat
    'türkç': 'Türkçe', 'türkçe': 'Türkçe', 'turkce': 'Türkçe', 'tr': 'Türkçe', 'tür': 'Türkçe', 'tur': 'Türkçe', 'trk': 'Türkçe',
    'hst': 'Türkçe (Kurs)', 'et7': 'Türkçe (Etüt)', 'et8': 'Türkçe (Etüt)', 'et6': 'Türkçe (Etüt)', 'et5': 'Türkçe (Etüt)',
    'edb': 'Edebiyat', 'edebiyat': 'Edebiyat', 'tde': 'Türk Dili ve Edebiyatı', 'türkdiliveedebiyatı': 'Türk Dili ve Edebiyatı',
    
    // Yabancı Dil
    'ing': 'İngilizce', 'i̇ng': 'İngilizce', 'ingilizce': 'İngilizce', 'yd': 'Yabancı Dil', 'yabancıdil': 'Yabancı Dil', 'ybd': 'Yabancı Dil',
    'native': 'İngilizce (Native)', 'hi': 'İngilizce (Kurs)', 'hı': 'İngilizce (Kurs)',
    'alm': 'Almanca', 'almanca': 'Almanca',
    'fra': 'Fransızca', 'fransızca': 'Fransızca', 'fr': 'Fransızca',
    
    // Sosyal Bilgiler / Tarih / Coğrafya
    'sb': 'Sosyal Bilgiler', 'sos': 'Sosyal Bilgiler', 'sosbil': 'Sosyal Bilgiler', 'sosyal': 'Sosyal Bilgiler', 'sosyalbilgiler': 'Sosyal Bilgiler',
    'es7': 'Sosyal Bilgiler (Etüt)', 'es8': 'Sosyal Bilgiler (Etüt)', 'es6': 'Sosyal Bilgiler (Etüt)', 'es5': 'Sosyal Bilgiler (Etüt)',
    'hit': 'İnkılap Tarihi', 'hıt': 'İnkılap Tarihi', 'ink': 'İnkılap Tarihi', 'ita': 'İnkılap Tarihi', 'inkılap': 'İnkılap Tarihi', 'inkılaptarihi': 'İnkılap Tarihi', 'tcinkılaptarihi': 'İnkılap Tarihi', 'tcinkılaptarihiveatatürkçülük': 'İnkılap Tarihi',
    'tar': 'Tarih', 'tarih': 'Tarih', 'trh': 'Tarih',
    'coğ': 'Coğrafya', 'cog': 'Coğrafya', 'coğrafya': 'Coğrafya', 'cğr': 'Coğrafya', 'cografya': 'Coğrafya',
    
    // Din Kültürü
    'dkvab': 'Din Kültürü', 'din': 'Din Kültürü', 'dkab': 'Din Kültürü', 'dinkül': 'Din Kültürü', 'hdk': 'Din Kültürü (Kurs)', 'dinkültürü': 'Din Kültürü', 'dinkültürüveahlakbilgisi': 'Din Kültürü',
    
    // Sanat / Spor / Bilişim / Teknoloji
    'gs': 'Görsel Sanatlar', 'görsel': 'Görsel Sanatlar', 'resim': 'Görsel Sanatlar', 'gör': 'Görsel Sanatlar', 'görselsanatlar': 'Görsel Sanatlar',
    'müzik': 'Müzik', 'müz': 'Müzik', 'muz': 'Müzik', 'mz': 'Müzik', 'muzik': 'Müzik',
    'be': 'Beden Eğitimi', 'beden': 'Beden Eğitimi', 'bed': 'Beden Eğitimi', 'spor': 'Beden Eğitimi', 'bes': 'Beden Eğitimi', 'bedeneğitimi': 'Beden Eğitimi', 'bedenegitimi': 'Beden Eğitimi', 'bedeneğitimivespor': 'Beden Eğitimi',
    'kod': 'Kodlama', 'bilişim': 'Bilişim Teknolojileri', 'bil': 'Bilişim Teknolojileri', 'yazılım': 'Yazılım', 'bty': 'Bilişim Teknolojileri', 'bilişimteknolojileri': 'Bilişim Teknolojileri',
    'tt': 'Teknoloji Tasarım', 'tek': 'Teknoloji Tasarım', 'tektas': 'Teknoloji Tasarım', 'teknoloji': 'Teknoloji Tasarım', 'teknolojitasarım': 'Teknoloji Tasarım', 'teknolojivetasarım': 'Teknoloji Tasarım',
    
    // İlkokul
    'hb': 'Hayat Bilgisi', 'hay': 'Hayat Bilgisi', 'hayat': 'Hayat Bilgisi', 'hayatbilgisi': 'Hayat Bilgisi',
    'se': 'Serbest Etkinlik', 'serbest': 'Serbest Etkinlik', 'serbestetkinlik': 'Serbest Etkinlik',
    'ofe': 'Oyun ve Fiziki Etkinlikler', 'oyun': 'Oyun ve Fiziki Etkinlikler', 'oyunvefizikietkinlikler': 'Oyun ve Fiziki Etkinlikler',
    
    // Lise / Diğer
    'fiz': 'Fizik', 'fizik': 'Fizik', 'fzk': 'Fizik',
    'kim': 'Kimya', 'kimya': 'Kimya', 'kmy': 'Kimya',
    'biy': 'Biyoloji', 'biyoloji': 'Biyoloji', 'byj': 'Biyoloji',
    'geo': 'Geometri', 'geometri': 'Geometri',
    'fel': 'Felsefe', 'felsefe': 'Felsefe', 'fls': 'Felsefe',
    'ss': 'Sosyal Etkinlik', 'ks': 'Kulüp Çalışması', 'kulüp': 'Kulüp Çalışması', 'sosyaletkinlik': 'Sosyal Etkinlik', 'kulüpçalışması': 'Kulüp Çalışması',
    'reh': 'Rehberlik', 'rehberlik': 'Rehberlik', 'rehberlikveyönlendirme': 'Rehberlik',
    'seç': 'Seçmeli Ders', 'sec': 'Seçmeli Ders', 'sç': 'Seçmeli Ders', 'sc': 'Seçmeli Ders', 'sçm': 'Seçmeli Ders', 'seçmeliders': 'Seçmeli Ders', 'secmeliders': 'Seçmeli Ders', 'seçmeli': 'Seçmeli Ders',
    'çev': 'Çevre Eğitimi', 'cev': 'Çevre Eğitimi', 'çevreeğitimi': 'Çevre Eğitimi',
    'dyk': 'Destekleme Kursu', 'et': 'Etüt', 'etüt': 'Etüt', 'kurs': 'Kurs',
    'trafik': 'Trafik ve İlk Yardım', 'trafikveilkyardım': 'Trafik ve İlk Yardım', 'sağlıkbilgisivetrafikkültürü': 'Trafik ve İlk Yardım',
    'sağlık': 'Sağlık Bilgisi', 'sağlıkbilgisi': 'Sağlık Bilgisi',
    'mantık': 'Mantık', 'mnt': 'Mantık',
    'psikoloji': 'Psikoloji', 'psk': 'Psikoloji',
    'sosyoloji': 'Sosyoloji', 'sosy': 'Sosyoloji',
    'astronomi': 'Astronomi', 'ast': 'Astronomi',
    'proje': 'Proje Hazırlama', 'projehazırlama': 'Proje Hazırlama',
    'girişimcilik': 'Girişimcilik', 'girişim': 'Girişimcilik',
    'diksiyon': 'Diksiyon ve Hitabet', 'diksiyonvehitabet': 'Diksiyon ve Hitabet',
    'kuran': 'Kur\'an-ı Kerim', 'kuranıkerim': 'Kur\'an-ı Kerim', 'kk': 'Kur\'an-ı Kerim',
    'peygamber': 'Peygamberimizin Hayatı', 'peygamberimizinhayatı': 'Peygamberimizin Hayatı', 'ph': 'Peygamberimizin Hayatı',
    'temeldini': 'Temel Dini Bilgiler', 'temeldinibilgiler': 'Temel Dini Bilgiler', 'tdb': 'Temel Dini Bilgiler',
    
    // Seçmeli Dersler
    'smat': 'Seçmeli Matematik', 'seçmelimatematik': 'Seçmeli Matematik', 'smatematik': 'Seçmeli Matematik',
    'sfiz': 'Seçmeli Fizik', 'seçmelifizik': 'Seçmeli Fizik', 'sfizik': 'Seçmeli Fizik',
    'skim': 'Seçmeli Kimya', 'seçmelikimya': 'Seçmeli Kimya', 'skimya': 'Seçmeli Kimya',
    'sbiy': 'Seçmeli Biyoloji', 'seçmelibiyoloji': 'Seçmeli Biyoloji', 'sbiyoloji': 'Seçmeli Biyoloji',
    'star': 'Seçmeli Tarih', 'seçmelitarih': 'Seçmeli Tarih', 'starih': 'Seçmeli Tarih',
    'scoğ': 'Seçmeli Coğrafya', 'seçmelicoğrafya': 'Seçmeli Coğrafya', 'scoğrafya': 'Seçmeli Coğrafya', 'scografya': 'Seçmeli Coğrafya',
    'sedb': 'Seçmeli Edebiyat', 'seçmeliedebiyat': 'Seçmeli Edebiyat', 'sedebiyat': 'Seçmeli Edebiyat',
    'sfel': 'Seçmeli Felsefe', 'seçmelifelsefe': 'Seçmeli Felsefe', 'sfelsefe': 'Seçmeli Felsefe',
    'sing': 'Seçmeli İngilizce', 'seçmeliingilizce': 'Seçmeli İngilizce', 'singilizce': 'Seçmeli İngilizce',
    'salm': 'Seçmeli Almanca', 'seçmelialmanca': 'Seçmeli Almanca', 'salmanca': 'Seçmeli Almanca',
    'sfra': 'Seçmeli Fransızca', 'seçmelifransızca': 'Seçmeli Fransızca', 'sfransızca': 'Seçmeli Fransızca',
    'smüz': 'Seçmeli Müzik', 'seçmelimüzik': 'Seçmeli Müzik', 'smüzik': 'Seçmeli Müzik', 'smuzik': 'Seçmeli Müzik',
    'sgs': 'Seçmeli Görsel Sanatlar', 'seçmeligörselsanatlar': 'Seçmeli Görsel Sanatlar', 'sgörselsanatlar': 'Seçmeli Görsel Sanatlar',
    'sbe': 'Seçmeli Beden Eğitimi', 'seçmelibedeneğitimi': 'Seçmeli Beden Eğitimi', 'sbedeneğitimi': 'Seçmeli Beden Eğitimi', 'sbedenegitimi': 'Seçmeli Beden Eğitimi',
    'sbil': 'Seçmeli Bilişim', 'seçmelibilişimteknolojileri': 'Seçmeli Bilişim', 'sbilişimteknolojileri': 'Seçmeli Bilişim', 'sbilişim': 'Seçmeli Bilişim',
    
    // Fen Lisesi Dersleri
    'flmat': 'Fen Lisesi Matematik', 'fenlisesimatematik': 'Fen Lisesi Matematik',
    'flfiz': 'Fen Lisesi Fizik', 'fenlisesifizik': 'Fen Lisesi Fizik',
    'flkim': 'Fen Lisesi Kimya', 'fenlisesikimya': 'Fen Lisesi Kimya',
    'flbiy': 'Fen Lisesi Biyoloji', 'fenlisesibiyoloji': 'Fen Lisesi Biyoloji'
  };

  if (wordsData && wordsData.length > 0) {
    const dayNodes: any[] = [];
    const subjectNodes: any[] = [];

    // First pass: find days and single-word subjects
    for (let i = 0; i < wordsData.length; i++) {
      const w = wordsData[i];
      const cleanText = w.text.trim().toLowerCase().replace(/[^a-z0-9çğıöşü]/g, '');
      if (!cleanText || cleanText.length < 2) continue;

      if (dayMap[cleanText] !== undefined) {
        dayNodes.push({
          day: dayMap[cleanText],
          text: cleanText,
          cx: (w.bbox.x0 + w.bbox.x1) / 2,
          cy: (w.bbox.y0 + w.bbox.y1) / 2
        });
      }
    }

    // Second pass: find subjects, checking for multi-word combinations
    let skipWords = new Set<number>();
    for (let i = 0; i < wordsData.length; i++) {
      if (skipWords.has(i)) continue;

      const w1 = wordsData[i];
      const t1 = w1.text.trim().toLowerCase().replace(/[^a-z0-9çğıöşü]/g, '');
      if (!t1 || t1.length < 2) continue;

      // Try 4 words
      if (i <= wordsData.length - 4) {
        const w2 = wordsData[i+1];
        const w3 = wordsData[i+2];
        const w4 = wordsData[i+3];
        const t2 = w2.text.trim().toLowerCase().replace(/[^a-z0-9çğıöşü]/g, '');
        const t3 = w3.text.trim().toLowerCase().replace(/[^a-z0-9çğıöşü]/g, '');
        const t4 = w4.text.trim().toLowerCase().replace(/[^a-z0-9çğıöşü]/g, '');
        
        // Check if they are roughly on the same line (y-coordinates are close)
        const yDiff1 = Math.abs(w1.bbox.y0 - w2.bbox.y0);
        const yDiff2 = Math.abs(w2.bbox.y0 - w3.bbox.y0);
        const yDiff3 = Math.abs(w3.bbox.y0 - w4.bbox.y0);
        
        if (yDiff1 < 20 && yDiff2 < 20 && yDiff3 < 20) {
          const combo4 = t1 + t2 + t3 + t4;
          if (exactSubjectMap[combo4]) {
            subjectNodes.push({
              subject: exactSubjectMap[combo4],
              cx: (w1.bbox.x0 + w4.bbox.x1) / 2,
              cy: (w1.bbox.y0 + w4.bbox.y1) / 2
            });
            skipWords.add(i).add(i+1).add(i+2).add(i+3);
            continue;
          }
        }
      }

      // Try 3 words
      if (i <= wordsData.length - 3) {
        const w2 = wordsData[i+1];
        const w3 = wordsData[i+2];
        const t2 = w2.text.trim().toLowerCase().replace(/[^a-z0-9çğıöşü]/g, '');
        const t3 = w3.text.trim().toLowerCase().replace(/[^a-z0-9çğıöşü]/g, '');
        
        // Check if they are roughly on the same line (y-coordinates are close)
        const yDiff1 = Math.abs(w1.bbox.y0 - w2.bbox.y0);
        const yDiff2 = Math.abs(w2.bbox.y0 - w3.bbox.y0);
        
        if (yDiff1 < 20 && yDiff2 < 20) {
          const combo3 = t1 + t2 + t3;
          if (exactSubjectMap[combo3]) {
            subjectNodes.push({
              subject: exactSubjectMap[combo3],
              cx: (w1.bbox.x0 + w3.bbox.x1) / 2,
              cy: (w1.bbox.y0 + w3.bbox.y1) / 2
            });
            skipWords.add(i).add(i+1).add(i+2);
            continue;
          }
        }
      }

      // Try 2 words
      if (i <= wordsData.length - 2) {
        const w2 = wordsData[i+1];
        const t2 = w2.text.trim().toLowerCase().replace(/[^a-z0-9çğıöşü]/g, '');
        
        // Check if they are roughly on the same line
        const yDiff = Math.abs(w1.bbox.y0 - w2.bbox.y0);
        
        if (yDiff < 20) {
          const combo2 = t1 + t2;
          if (exactSubjectMap[combo2]) {
            subjectNodes.push({
              subject: exactSubjectMap[combo2],
              cx: (w1.bbox.x0 + w2.bbox.x1) / 2,
              cy: (w1.bbox.y0 + w2.bbox.y1) / 2
            });
            skipWords.add(i).add(i+1);
            continue;
          }
        }
      }

      // Try 1 word
      if (exactSubjectMap[t1] && dayMap[t1] === undefined) {
        subjectNodes.push({
          subject: exactSubjectMap[t1],
          cx: (w1.bbox.x0 + w1.bbox.x1) / 2,
          cy: (w1.bbox.y0 + w1.bbox.y1) / 2
        });
      }
    }

    if (dayNodes.length > 0 && subjectNodes.length > 0) {
      // Determine layout (vertical or horizontal)
      let isVertical = true;
      if (dayNodes.length >= 2) {
        let minCx = Infinity, maxCx = -Infinity;
        let minCy = Infinity, maxCy = -Infinity;
        for (const dn of dayNodes) {
          if (dn.cx < minCx) minCx = dn.cx;
          if (dn.cx > maxCx) maxCx = dn.cx;
          if (dn.cy < minCy) minCy = dn.cy;
          if (dn.cy > maxCy) maxCy = dn.cy;
        }
        const rangeX = maxCx - minCx;
        const rangeY = maxCy - minCy;
        isVertical = rangeY > rangeX;
      }

      // Sort day nodes to handle duplicates like 'cu'
      dayNodes.sort((a, b) => isVertical ? a.cy - b.cy : a.cx - b.cx);
      let cuCount = 0;
      for (const dn of dayNodes) {
        if (dn.text === 'cu' || dn.text === 'cum') {
          cuCount++;
          if (cuCount >= 2) dn.day = 6; // Second 'cu' is Cumartesi
        }
      }

      const lessonsMap: Record<string, Set<number>> = {};
      for (const sn of subjectNodes) {
        let closestDay = -1;
        let minDist = Infinity;
        for (const dn of dayNodes) {
          const dist = isVertical ? Math.abs(sn.cy - dn.cy) : Math.abs(sn.cx - dn.cx);
          if (dist < minDist) {
            minDist = dist;
            closestDay = dn.day;
          }
        }
        if (closestDay !== -1) {
          if (!lessonsMap[sn.subject]) lessonsMap[sn.subject] = new Set();
          lessonsMap[sn.subject].add(closestDay);
        }
      }

      const lessons = [];
      for (const [title, daysSet] of Object.entries(lessonsMap)) {
        lessons.push({ title, daysOfWeek: Array.from(daysSet) });
      }
      
      if (lessons.length > 0) {
        return { lessons };
      }
    }
  }

  // Fallback to text lines parsing if bounding boxes aren't available or failed
  const lines = text.split('\n').map(l => l.trim().toLowerCase()).filter(l => l.length > 0);
  const daysRegex = /^(pazartesi|pzt|pa|ptesi|ptes|pazart|salı|sali|sa|sl|sal|çarşamba|carsamba|çar|ça|çrş|crs|çarşamb|carsamb|çarş|cars|perşembe|persembe|per|pe|prş|prs|perşemb|persemb|perş|pers|cuma|cum|cu|cumartesi|cmt|ct|ctesi|ctes|cumartes|cumart|pazar|paz|pz)\b/;
  
  const lessonsMap: Record<string, Set<number>> = {};
  let currentDay = -1;
  let cuCount = 0;

  for (const line of lines) {
    const dayMatch = line.match(daysRegex);
    if (dayMatch) {
      const matchedDay = dayMatch[1];
      if (matchedDay === 'cu' || matchedDay === 'cum') {
        cuCount++;
        currentDay = cuCount >= 2 ? 6 : 5;
      } else {
        currentDay = dayMap[matchedDay];
      }
    } else {
      const longDayMatch = line.match(/\b(pazartesi|pzt|ptesi|ptes|pazart|salı|sali|çarşamba|carsamba|çarş|cars|çrş|crs|çarşamb|carsamb|perşembe|persembe|perş|pers|prş|prs|perşemb|persemb|cuma|cumartesi|cmt|ctesi|ctes|cumartes|cumart|pazar)\b/);
      if (longDayMatch) {
        currentDay = dayMap[longDayMatch[1]];
      }
    }

    if (currentDay === -1) continue;

    const cleanLine = line.replace(/[^a-z0-9çğıöşü\s]/g, ' ');
    const words = cleanLine.split(/\s+/).filter(w => w.length >= 2);
    
    // Check for multi-word combinations first (up to 3 words)
    let skipWords = new Set<number>();
    
    for (let i = 0; i < words.length; i++) {
      if (skipWords.has(i)) continue;
      
      // Try 4 words
      if (i <= words.length - 4) {
        const combo4 = words[i] + words[i+1] + words[i+2] + words[i+3];
        if (exactSubjectMap[combo4]) {
          const subject = exactSubjectMap[combo4];
          if (!lessonsMap[subject]) lessonsMap[subject] = new Set();
          lessonsMap[subject].add(currentDay);
          skipWords.add(i).add(i+1).add(i+2).add(i+3);
          continue;
        }
      }

      // Try 3 words
      if (i <= words.length - 3) {
        const combo3 = words[i] + words[i+1] + words[i+2];
        if (exactSubjectMap[combo3]) {
          const subject = exactSubjectMap[combo3];
          if (!lessonsMap[subject]) lessonsMap[subject] = new Set();
          lessonsMap[subject].add(currentDay);
          skipWords.add(i).add(i+1).add(i+2);
          continue;
        }
      }
      
      // Try 2 words
      if (i <= words.length - 2) {
        const combo2 = words[i] + words[i+1];
        if (exactSubjectMap[combo2]) {
          const subject = exactSubjectMap[combo2];
          if (!lessonsMap[subject]) lessonsMap[subject] = new Set();
          lessonsMap[subject].add(currentDay);
          skipWords.add(i).add(i+1);
          continue;
        }
      }
      
      // Try 1 word
      const word = words[i];
      if (exactSubjectMap[word]) {
        const subject = exactSubjectMap[word];
        if (!lessonsMap[subject]) lessonsMap[subject] = new Set();
        lessonsMap[subject].add(currentDay);
      }
    }
  }

  const lessons = [];
  for (const [title, daysSet] of Object.entries(lessonsMap)) {
    lessons.push({ title, daysOfWeek: Array.from(daysSet) });
  }

  return { lessons };
}
