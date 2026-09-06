(function(){
  'use strict';
  window.MH = window.MH || {};

  // 3. SINIF MEB MÜFREDATI KAPSAMLI SORU VE KAZANIM VERİ BANKASI
  const TURKISH_SYNONYMS = [
    { q: 'Al', a: 'Kırmızı', wrongs: ['Mavi', 'Sarı', 'Yeşil'] },
    { q: 'Ak', a: 'Beyaz', wrongs: ['Siyah', 'Gri', 'Koyu'] },
    { q: 'Kara', a: 'Siyah', wrongs: ['Beyaz', 'Sarı', 'Pembe'] },
    { q: 'Yurt', a: 'Vatan', wrongs: ['Şehir', 'Sokak', 'Ev'] },
    { q: 'Konuk', a: 'Misafir', wrongs: ['Ev sahibi', 'Komşu', 'Yolcu'] },
    { q: 'Öğrenci', a: 'Talebe', wrongs: ['Öğretmen', 'Müdür', 'Memur'] },
    { q: 'Öğretmen', a: 'Muallim', wrongs: ['Doktor', 'Mühendis', 'Avukat'] },
    { q: 'Hekim', a: 'Doktor', wrongs: ['Hemşire', 'Eczacı', 'Hasta'] },
    { q: 'Cevap', a: 'Yanıt', wrongs: ['Soru', 'İtiraz', 'Söz'] },
    { q: 'Sual', a: 'Soru', wrongs: ['Cevap', 'Çözüm', 'Sonuç'] },
    { q: 'Yürek', a: 'Kalp', wrongs: ['Akıl', 'Mide', 'Ciğer'] },
    { q: 'Hediye', a: 'Armağan', wrongs: ['Ücret', 'Ödünç', 'Emanet'] },
    { q: 'Lider', a: 'Önder', wrongs: ['Üye', 'Asker', 'Yolcu'] },
    { q: 'Yaşlı', a: 'İhtiyar', wrongs: ['Genç', 'Çocuk', 'Bebek'] },
    { q: 'Cümle', a: 'Tümce', wrongs: ['Kelime', 'Hece', 'Harf'] },
    { q: 'Kelime', a: 'Sözcük', wrongs: ['Paragraf', 'Cümle', 'Metin'] },
    { q: 'Vazife', a: 'Görev', wrongs: ['Tatil', 'Oyun', 'Dinlenme'] },
    { q: 'Fakir', a: 'Yoksul', wrongs: ['Zengin', 'Varlıklı', 'Tüccar'] },
    { q: 'Rüzgar', a: 'Yel', wrongs: ['Yağmur', 'Fırtına', 'Bulut'] },
    { q: 'Zaman', a: 'Vakit', wrongs: ['Mekan', 'Yıl', 'Saat'] },
    { q: 'Hatıra', a: 'Anı', wrongs: ['Hayal', 'Rüya', 'Gelecek'] },
    { q: 'Doğa', a: 'Tabiat', wrongs: ['Şehir', 'Bina', 'Fabrika'] }
  ];

  const TURKISH_ANTONYMS = [
    { q: 'Sıcak', a: 'Soğuk', wrongs: ['Ilık', 'Kaynar', 'Kuru'] },
    { q: 'Hızlı', a: 'Yavaş', wrongs: ['Çabuk', 'Seri', 'Durgun'] },
    { q: 'Genç', a: 'Yaşlı', wrongs: ['Çocuk', 'Bebek', 'Kuvvetli'] },
    { q: 'Zengin', a: 'Fakir', wrongs: ['Varlıklı', 'Güçlü', 'Cömert'] },
    { q: 'Aşağı', a: 'Yukarı', wrongs: ['İleri', 'Geri', 'Sağ'] },
    { q: 'Açık', a: 'Kapalı', wrongs: ['Geniş', 'Aydınlık', 'Temiz'] },
    { q: 'Kolay', a: 'Zor', wrongs: ['Basit', 'Hafif', 'Rahat'] },
    { q: 'Ağır', a: 'Hafif', wrongs: ['Yavaş', 'Kaba', 'Küçük'] },
    { q: 'Taze', a: 'Bayat', wrongs: ['Çürük', 'Eski', 'Sert'] },
    { q: 'Uzun', a: 'Kısa', wrongs: ['Dar', 'İnce', 'Geniş'] },
    { q: 'Cesur', a: 'Korkak', wrongs: ['Güçlü', 'Yiğit', 'Hızlı'] },
    { q: 'Temiz', a: 'Kirli', wrongs: ['Pak', 'Açık', 'Işıltılı'] },
    { q: 'Gündüz', a: 'Gece', wrongs: ['Sabah', 'Öğle', 'Akşam'] },
    { q: 'Dolu', a: 'Boş', wrongs: ['Ağır', 'Büyük', 'Taşkın'] },
    { q: 'Tatlı', a: 'Acı', wrongs: ['Tuzlu', 'Ekşi', 'Lezzetli'] },
    { q: 'İçeri', a: 'Dışarı', wrongs: ['Oda', 'Ev', 'Yukarı'] }
  ];

  const TURKISH_READING_5N1K = [
    { q: 'Eylül sabah erkenden okula gitti. Eylül ne zaman gitti?', a: 'Sabah erkenden', wrongs: ['Akşamüstü', 'Öğle vakti', 'Gece'] },
    { q: 'Kedi Minnoş sepette mışıl mışıl uyuyor. Minnoş nerede uyuyor?', a: 'Sepette', wrongs: ['Ağaçta', 'Çatıda', 'Bahçede'] },
    { q: 'Ali kırılan oyuncağını tamir etti. Ali neyi tamir etti?', a: 'Kırılan oyuncağını', wrongs: ['Bisikletini', 'Kitabını', 'Saatini'] },
    { q: 'Yağmur yağdığı için şemsiyesini açtı. Neden şemsiyesini açtı?', a: 'Yağmur yağdığı için', wrongs: ['Güneş açtığı için', 'Üşüdüğü için', 'Sıkıldığı için'] },
    { q: 'Can ile Efe parkta neşeyle top oynadı. Kimler top oynadı?', a: 'Can ile Efe', wrongs: ['Öğretmenler', 'Eylül ile Zeynep', 'Büyükler'] },
    { q: 'Dün kütüphaneden harika bir masal kitabı aldım. Masal kitabını nereden aldım?', a: 'Kütüphaneden', wrongs: ['Marketten', 'Okuldan', 'Parktan'] },
    { q: 'Ayşe doğum günü pastasını sevinçle kesti. Ayşe nasıl kesti?', a: 'Sevinçle', wrongs: ['Üzüntüyle', 'Ağlayarak', 'Korkarak'] }
  ];

  const SCIENCE_MATTER = [
    { q: 'Buz küpü hangi haldedir?', a: 'Katı', wrongs: ['Sıvı', 'Gaz', 'Işık'] },
    { q: 'İçtiğimiz süt hangi haldedir?', a: 'Sıvı', wrongs: ['Katı', 'Gaz', 'Plazma'] },
    { q: 'Kaynayan çaydanlıktan çıkan buhar?', a: 'Gaz', wrongs: ['Katı', 'Sıvı', 'Kaya'] },
    { q: 'Zeytinyağı maddenin hangi halidir?', a: 'Sıvı', wrongs: ['Katı', 'Gaz', 'Kaya'] },
    { q: 'Yazı yazdığımız kurşun kalem?', a: 'Katı', wrongs: ['Sıvı', 'Gaz', 'Hava'] },
    { q: 'Uçan balonun içindeki helyum?', a: 'Gaz', wrongs: ['Katı', 'Sıvı', 'Toprak'] },
    { q: 'Teneffüste içtiğimiz meyve suyu?', a: 'Sıvı', wrongs: ['Katı', 'Gaz', 'Ateş'] },
    { q: 'Demir çekiç hangi haldedir?', a: 'Katı', wrongs: ['Sıvı', 'Gaz', 'Hava'] }
  ];

  const SCIENCE_EARTH = [
    { q: 'Balıkların yaşadığı katman hangisidir?', a: 'Su katmanı', wrongs: ['Kara katmanı', 'Hava katmanı', 'Çekirdek'] },
    { q: 'Üzerinde yürüdüğümüz, evler yaptığımız katman?', a: 'Kara katmanı', wrongs: ['Hava katmanı', 'Su katmanı', 'Ateş küre'] },
    { q: 'Kuşların uçtuğu ve nefes aldığımız katman?', a: 'Hava katmanı (Atmosfer)', wrongs: ['Taş katmanı', 'Yer çekirdeği', 'Su katmanı'] },
    { q: 'Dünyamızın şekli neye benzer?', a: 'Küre', wrongs: ['Kare', 'Üçgen', 'Düz Tepsi'] },
    { q: 'Dünyamızın en sıcak ve en iç katmanı?', a: 'Çekirdek (Ağır Küre)', wrongs: ['Hava katmanı', 'Su katmanı', 'Yer kabuğu'] }
  ];

  const SCIENCE_SENSES = [
    { q: 'Çevremizdeki renkleri görmemizi sağlayan organ?', a: 'Göz', wrongs: ['Kulak', 'Burun', 'Dil'] },
    { q: 'Müzik seslerini duymamızı sağlayan duyu organı?', a: 'Kulak', wrongs: ['Göz', 'Deri', 'Dil'] },
    { q: 'Gülün mis gibi kokusunu hangi organla alırız?', a: 'Burun', wrongs: ['Göz', 'Kulak', 'Deri'] },
    { q: 'Limonun ekşiliğini hangi organla hissederiz?', a: 'Dil', wrongs: ['Burun', 'Deri', 'Göz'] },
    { q: 'Kedinin yumuşacık tüylerini hangi duyuyla hissederiz?', a: 'Deri (Dokunma)', wrongs: ['Dil', 'Burun', 'Kulak'] }
  ];

  const SCIENCE_FORCES = [
    { q: 'Duran bir futbol topuna tekme atmak?', a: 'İtme kuvveti', wrongs: ['Çekme kuvveti', 'Durdurma', 'Ağırlık'] },
    { q: 'Odanın kapalı çekmecesini açmak?', a: 'Çekme kuvveti', wrongs: ['İtme kuvveti', 'Dönme', 'Sürtünme'] },
    { q: 'Market arabasını ileri doğru sürmek?', a: 'İtme kuvveti', wrongs: ['Çekme kuvveti', 'Kaldırma', 'Durdurma'] },
    { q: 'Kuyudan su dolu kovayı yukarı almak?', a: 'Çekme kuvveti', wrongs: ['İtme kuvveti', 'İtme ve dönme', 'Sıvı kuvveti'] },
    { q: 'Mıknatısın demir çivileri tutması?', a: 'Çekme kuvveti', wrongs: ['İtme kuvveti', 'Bölme kuvveti', 'İtme'] }
  ];

  MH.Questions = {
    // Genel soru oluşturucu (Ders bazlı esnek altyapı)
    generate: function(type = 'mixed', difficulty = 3) {
      // 1. TÜRKÇE DERSİ SORULARI
      if (type === 'turkish_synonym') {
        const item = TURKISH_SYNONYMS[this._rand(0, TURKISH_SYNONYMS.length - 1)];
        return {
          text: `"${item.q}" kelimesinin eş anlamlısı?`,
          answer: item.a,
          choices: this._shuffle([item.a, ...item.wrongs.slice(0, 3)])
        };
      }
      if (type === 'turkish_antonym') {
        const item = TURKISH_ANTONYMS[this._rand(0, TURKISH_ANTONYMS.length - 1)];
        return {
          text: `"${item.q}" kelimesinin zıt anlamlısı?`,
          answer: item.a,
          choices: this._shuffle([item.a, ...item.wrongs.slice(0, 3)])
        };
      }
      if (type === 'turkish_reading') {
        const item = TURKISH_READING_5N1K[this._rand(0, TURKISH_READING_5N1K.length - 1)];
        return {
          text: item.q,
          answer: item.a,
          choices: this._shuffle([item.a, ...item.wrongs])
        };
      }

      // 2. FEN BİLGİSİ DERSİ SORULARI
      if (type === 'science_matter') {
        const item = SCIENCE_MATTER[this._rand(0, SCIENCE_MATTER.length - 1)];
        return {
          text: item.q,
          answer: item.a,
          choices: this._shuffle([item.a, ...item.wrongs.slice(0, 3)])
        };
      }
      if (type === 'science_earth') {
        const item = SCIENCE_EARTH[this._rand(0, SCIENCE_EARTH.length - 1)];
        return {
          text: item.q,
          answer: item.a,
          choices: this._shuffle([item.a, ...item.wrongs.slice(0, 3)])
        };
      }
      if (type === 'science_senses') {
        const item = SCIENCE_SENSES[this._rand(0, SCIENCE_SENSES.length - 1)];
        return {
          text: item.q,
          answer: item.a,
          choices: this._shuffle([item.a, ...item.wrongs.slice(0, 3)])
        };
      }
      if (type === 'science_forces') {
        const item = SCIENCE_FORCES[this._rand(0, SCIENCE_FORCES.length - 1)];
        return {
          text: item.q,
          answer: item.a,
          choices: this._shuffle([item.a, ...item.wrongs.slice(0, 3)])
        };
      }

      // 3. MATEMATİK DERSİ (3. Sınıf MEB Kazanımları)
      let resolvedType = type;
      if (type === 'mixed') {
        // 3. sınıf ağırlıklı: Çarpma, bölme, eldeli toplama, onluk bozmalı çıkarma
        const types = ['mul', 'mul', 'add', 'sub', 'div', 'round'];
        resolvedType = types[this._rand(0, types.length - 1)];
      }

      let num1, num2, answer, text;
      
      switch(resolvedType) {
        case 'mul': {
          // 3. Sınıf Çarpım Tablosu (Özellikle 4, 6, 7, 8, 9 ve 10'lar)
          const tables = [3, 4, 5, 6, 7, 8, 9, 10];
          num1 = tables[this._rand(0, tables.length - 1)];
          num2 = this._rand(2, 9);
          text = `${num1} × ${num2} = ?`;
          answer = num1 * num2;
          break;
        }

        case 'div': {
          // 3. Sınıf Kalansız Bölme
          num2 = this._rand(2, 8);
          answer = this._rand(2, 9);
          num1 = num2 * answer;
          text = `${num1} ÷ ${num2} = ?`;
          break;
        }

        case 'add': {
          // 3 Basamaklı veya 2 Basamaklı Eldeli Toplama
          if (difficulty >= 4) {
            num1 = this._rand(110, 350);
            num2 = this._rand(25, 140);
          } else {
            num1 = this._rand(15, 65);
            num2 = this._rand(14, 45);
          }
          text = `${num1} + ${num2} = ?`;
          answer = num1 + num2;
          break;
        }

        case 'sub': {
          // Onluk / Yüzlük Bozmalı Çıkarma
          if (difficulty >= 4) {
            num1 = this._rand(150, 480);
            num2 = this._rand(30, num1 - 20);
          } else {
            num1 = this._rand(35, 95);
            num2 = this._rand(16, num1 - 10);
          }
          text = `${num1} - ${num2} = ?`;
          answer = num1 - num2;
          break;
        }

        case 'round': {
          // 3. Sınıf: En Yakın Onluğa Yuvarlama
          const base = this._rand(12, 98);
          const lastDigit = base % 10;
          answer = lastDigit >= 5 ? base + (10 - lastDigit) : base - lastDigit;
          text = `${base} sayısı en yakın onluğa?`;
          break;
        }

        case 'fraction': {
          // 3. Sınıf: Yarım ve Çeyrek
          const isQuarter = Math.random() > 0.5;
          if (isQuarter) {
            answer = this._rand(2, 8);
            const total = answer * 4;
            text = `${total} sayısının çeyreği kaçtır?`;
          } else {
            answer = this._rand(4, 15);
            const total = answer * 2;
            text = `${total} sayısının yarısı kaçtır?`;
          }
          break;
        }

        default: {
          num1 = this._rand(6, 25);
          num2 = this._rand(4, 20);
          text = `${num1} + ${num2} = ?`;
          answer = num1 + num2;
        }
      }

      // Şıkları üret (Zekice yanıltıcı seçenekler)
      const choices = [answer];
      while(choices.length < 4) {
        let wrong;
        const delta = this._rand(1, 4) * (Math.random() > 0.5 ? 1 : -1);
        if (typeof answer === 'number') {
          wrong = answer + delta;
          if (wrong === answer || wrong < 0) wrong = answer + 10;
        } else {
          wrong = 'Yanlış Seçenek';
        }
        if (!choices.includes(wrong)) {
          choices.push(wrong);
        }
      }

      return {
        text: text,
        answer: answer,
        choices: this._shuffle(choices)
      };
    },

    generateTarget: function(difficulty) {
      let target;
      if (difficulty <= 3) target = this._rand(12, 28);
      else if (difficulty <= 7) target = this._rand(24, 48);
      else target = this._rand(35, 80);

      const expressions = [];
      const count = 12;
      let corrects = 0;

      for (let i = 0; i < count; i++) {
        const isCorrect = corrects < 4 || (Math.random() > 0.5 && corrects < 6);
        if (isCorrect) corrects++;

        const op = this._rand(0, 2);
        let text, val;

        if (op === 0) { // Toplama
          val = isCorrect ? target : target + this._rand(-4, 4, [0]);
          const a = this._rand(1, Math.max(2, val - 1));
          text = `${a} + ${val - a}`;
        } else if (op === 1) { // Çıkarma
          val = isCorrect ? target : target + this._rand(-4, 4, [0]);
          const sub = this._rand(3, 20);
          text = `${val + sub} - ${sub}`;
        } else { // Çarpma
          const factors = this._getFactors(isCorrect ? target : target + this._rand(-3, 3, [0]));
          if (factors.length > 0) {
            const f = factors[Math.floor(Math.random() * factors.length)];
            val = f[0] * f[1];
            text = `${f[0]} × ${f[1]}`;
          } else {
            val = isCorrect ? target : target + 2;
            text = `${val} × 1`;
          }
        }

        expressions.push({
          text: text,
          value: val,
          correct: (val === target)
        });
      }

      return {
        target: target,
        expressions: this._shuffle(expressions)
      };
    },

    generatePairs: function(target, count, difficulty) {
      const pairs = [];
      const distractorCount = Math.floor(count / 2);
      
      for (let i = 0; i < count; i++) {
        const a = this._rand(1, target - 1);
        const b = target - a;
        pairs.push(a, b);
      }

      for (let i = 0; i < distractorCount; i++) {
        const d = this._rand(1, target + 10);
        if (pairs.indexOf(d) === -1) {
          pairs.push(d);
        }
      }

      return this._shuffle(pairs);
    },

    _rand: function(min, max, exclude = []) {
      let r;
      do {
        r = Math.floor(Math.random() * (max - min + 1)) + min;
      } while (exclude.indexOf(r) !== -1);
      return r;
    },

    _shuffle: function(arr) {
      const res = arr.slice();
      for (let i = res.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = res[i];
        res[i] = res[j];
        res[j] = temp;
      }
      return res;
    },

    _getFactors: function(n) {
      const factors = [];
      for (let i = 2; i <= Math.sqrt(n); i++) {
        if (n % i === 0) {
          factors.push([i, n / i]);
        }
      }
      return factors;
    }
  };
})();
