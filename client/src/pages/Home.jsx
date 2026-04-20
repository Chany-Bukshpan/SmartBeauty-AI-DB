/**
 * Landing page: hero, category links, featured sections, interactive split hero (pointer tracking).
 */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const TAGLINES = [
  'איכות פרימיום במחיר הוגן',
  'המבחר הכי מעודכן בארץ',
  'חוויית קנייה יוקרתית ונקייה',
  'משלוחים מהירים — שירות אישי',
  'האיפור שלך מתחיל כאן',
];

const HERO_SLIDES = [
  { line: 'מגוון איפור איכותי ממיטב המותגים', gradient: 'linear-gradient(135deg, #e8d5cc 0%, #d4b8a8 50%, #c9a89a 100%)' },
  { line: 'משלוח מהיר — עד הבית', gradient: 'linear-gradient(135deg, #d4b8a8 0%, #c9a89a 50%, #b89585 100%)' },
  { line: 'מחירים הוגנים ומבצעים בהרשמה', gradient: 'linear-gradient(135deg, #c9a89a 0%, #b89585 50%, #a67f6f 100%)' },
];

const TRUST_ITEMS = [
  { icon: '✉', label: 'משלוח חינם בהזמנה מעל 199₪' },
  { icon: '🔒', label: 'תשלום מאובטח' },
  { icon: '♥', label: 'שירות לקוחות אדיב' },
];

const STATS = [
  { value: 'מבחר רחב', label: 'מוצרי איפור' },
  { value: 'משלוח חינם', label: 'מעל 199₪' },
  { value: 'שירות', label: 'לקוחות מקצועי' },
];

const MARQUEE_WORDS = ['איכות', 'פרימיום', 'משלוח מהיר', 'מבצעים', 'מותגים', 'יוקרה', 'שירות', 'מגוון', 'איפור', 'עד הבית'];

const getImagePath = (num, ext) => `/imagesHome/${num}.${ext}`;

/* ארבע קטגוריות: עיניים=1.png, ריסים=2.png, פנים=3.png, שפתיים=4.png */
const SPLIT_PANELS = [
  {
    imageKey: 1,
    to: '/products?category=עיניים',
    tag: 'עיניים',
    title: ['מבט', 'שמדבר'],
    sub: 'צלליות, עפרונות ועיטור ריסים\nבגוונים שמחמיאים לכל עין',
    label: '01',
    en: 'eyes',
    cta: 'גלי עיניים',
  },
  {
    imageKey: 2,
    to: '/products?category=ריסים',
    tag: 'ריסים',
    title: ['ריסים', 'מלאי נפח'],
    sub: 'מסקרה, ריסים מדבקים וסרום\nלמבט מודגש וטבעי',
    label: '02',
    en: 'lashes',
    cta: 'גלי ריסים',
  },
  {
    imageKey: 3,
    to: '/products?category=פנים',
    tag: 'פנים',
    title: ['פנים', 'מושלמות'],
    sub: 'בסיס, סומק, הארה וקונסילר\nלעור זוהר ומוגן',
    label: '03',
    en: 'face',
    cta: 'גלי פנים',
  },
  {
    imageKey: 4,
    to: '/products?category=שפתיים',
    tag: 'שפתיים',
    title: ['שפתיים', 'במרכז תשומת הלב'],
    sub: 'שפתונים, גלוס ומרקמים\nבגוונים שמושכים את העין',
    label: '04',
    en: 'lips',
    cta: 'גלי שפתיים',
  },
];

function Home() {
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [usePng, setUsePng] = useState({});
  const [isPointerInSplit, setIsPointerInSplit] = useState(false);
  const splitCursorRef = useRef(null);
  const splitRingRef = useRef(null);
  const splitDustRef = useRef(null);
  const splitHeroRef = useRef(null);
  const splitPanelsRef = useRef(null);

  const handleImageError = (key) => {
    setUsePng((prev) => ({ ...prev, [key]: false }));
  };

  useEffect(() => {
    const t = setInterval(() => setTaglineIndex((i) => (i + 1) % TAGLINES.length), 3200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSlideIndex((i) => (i + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const stage = document.querySelector('.home-split-stage');
    if (!stage) return;
    const onMove = (e) => {
      setIsPointerInSplit(true);

      if (splitCursorRef.current) {
        splitCursorRef.current.style.left = e.clientX + 'px';
        splitCursorRef.current.style.top = e.clientY + 'px';
      }
      if (splitRingRef.current) {
        requestAnimationFrame(() => {
          if (!splitRingRef.current) return;
          splitRingRef.current.style.left = e.clientX + 'px';
          splitRingRef.current.style.top = e.clientY + 'px';
        });
      }
    };

    stage.addEventListener('pointermove', onMove, { passive: true });
    stage.addEventListener('mousemove', onMove, { passive: true });

    return () => {
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('mousemove', onMove);
    };
  }, []);

  useEffect(() => {
    const el = splitPanelsRef.current;
    if (!el) return;

    const EXIT_THRESHOLD_PX = 120;

    const checkHeroInView = () => {
      const rect = el.getBoundingClientRect();
      const heroInView =
        rect.bottom > EXIT_THRESHOLD_PX &&
        rect.top < window.innerHeight;

      if (!heroInView) {
        setIsPointerInSplit(false);
      }
    };

    checkHeroInView();

    let raf = 0;
    const onScrollOrResize = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        checkHeroInView();
      });
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const onEnterSplitPanel = () => {
    if (splitCursorRef.current) {
      splitCursorRef.current.style.width = '14px';
      splitCursorRef.current.style.height = '14px';
    }
    if (splitRingRef.current) {
      splitRingRef.current.style.width = '52px';
      splitRingRef.current.style.height = '52px';
    }
  };
  const onLeaveSplitPanel = () => {
    if (splitCursorRef.current) {
      splitCursorRef.current.style.width = '8px';
      splitCursorRef.current.style.height = '8px';
    }
    if (splitRingRef.current) {
      splitRingRef.current.style.width = '36px';
      splitRingRef.current.style.height = '36px';
    }
  };

  useEffect(() => {
    const container = splitDustRef.current;
    if (!container) return;
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('div');
      p.className = 'split-particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = 8 + Math.random() * 14 + 's';
      p.style.animationDelay = Math.random() * 12 + 's';
      p.style.opacity = String(Math.random() * 0.25);
      const sz = 1 + Math.random() * 2 + 'px';
      p.style.width = sz;
      p.style.height = sz;
      container.appendChild(p);
    }
  }, []);

  return (
    <div className="home">
      {/* פס אמון עליון — מינימלי ואמין */}
      <section className="home-trust-bar" aria-label="יתרונות">
        <div className="home-trust-inner">
          {TRUST_ITEMS.map((item, i) => (
            <span key={i} className="home-trust-item">
              <span className="home-trust-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </span>
          ))}
        </div>
      </section>

      {/* הירו — סגנון פאנלים מפוצלים (לומה): 4 תמונות, hover מרחיב ומגלה תוכן */}
      <section
        ref={splitHeroRef}
        className={`home-split-hero ${isPointerInSplit ? 'is-pointer-inside' : ''}`}
        aria-label="גלריית איפור"
        onMouseEnter={() => setIsPointerInSplit(true)}
        onMouseLeave={() => setIsPointerInSplit(false)}
      >
        <div className="split-cursor" ref={splitCursorRef} aria-hidden="true" />
        <div className="split-ring" ref={splitRingRef} aria-hidden="true" />
        <div className="split-grain" aria-hidden="true" />
        <div className="home-split-stage">
          <div className="split-panels" ref={splitPanelsRef}>
            {SPLIT_PANELS.map((panel, i) => {
              const ext = usePng[panel.imageKey] === false ? 'jpg' : 'png';
              const imgSrc = getImagePath(panel.imageKey, ext);
              return (
                <div
                  key={i}
                  className="split-panel"
                  onMouseEnter={onEnterSplitPanel}
                  onMouseLeave={onLeaveSplitPanel}
                  aria-label={panel.tag}
                >
                  <img
                    className="split-panel-img"
                    src={imgSrc}
                    alt=""
                    onError={() => handleImageError(panel.imageKey)}
                  />
                  <div className="split-panel-grad-top" />
                  <div className="split-panel-grad-bottom" />
                  <div className="split-panel-reveal">
                    <span className="split-reveal-tag">{panel.tag}</span>
                    <div className="split-reveal-title">
                      {panel.title.map((line, li) => (
                        <span key={li} className="split-reveal-title-line">{line}</span>
                      ))}
                    </div>
                    <div className="split-reveal-divider" />
                    <p className="split-reveal-sub">{panel.sub}</p>
                    <Link to={panel.to} className="split-reveal-cta">
                      {panel.cta}
                    </Link>
                  </div>
                  <div className="split-panel-label">
                    <span className="split-label-number">{panel.label}</span>
                    <span className="split-label-en">{panel.en}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="split-dust" ref={splitDustRef} aria-hidden="true" />
          <div className="split-bottom">
            <span className="split-bottom-hint">חנות איפור</span>
            <a href="#features" className="split-scroll-line" aria-label="גלול למטה" />
            <span className="split-bottom-hint">hover לגלות</span>
          </div>
        </div>
      </section>

      {/* קרוסלה עדינה — פס אחד מתחת להירו */}
      <section className="home-carousel" aria-label="באנר">
        <div className="home-carousel-track">
          {HERO_SLIDES.map((slide, i) => (
            <div
              key={i}
              className={`home-carousel-slide ${i === slideIndex ? 'active' : ''}`}
              style={{ background: slide.gradient }}
              aria-hidden={i !== slideIndex}
            >
              <p className="home-carousel-text">{slide.line}</p>
            </div>
          ))}
        </div>
        <div className="home-carousel-dots">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`home-carousel-dot ${i === slideIndex ? 'active' : ''}`}
              onClick={() => setSlideIndex(i)}
              aria-label={`שקופית ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* פס סטטיסטיקות — מספרים ואמון */}
      <section className="home-stats" aria-label="סטטיסטיקות">
        <div className="home-stats-inner">
          {STATS.map((stat, i) => (
            <div key={i} className="home-stat">
              <span className="home-stat-value">{stat.value}</span>
              <span className="home-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* מארקי — פס גלילה */}
      <section className="home-marquee" aria-hidden="true">
        <div className="home-marquee-track">
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((word, i) => (
            <span key={i} className="home-marquee-word">{word}</span>
          ))}
        </div>
      </section>

      {/* בלוק יתרונות — כרטיסים מעוצבים (הקטגוריות עכשיו בארבעת המלבנים בהירו) */}
      <section className="home-features" id="features">
        <h2 className="home-features-title">למה לבחור בנו</h2>
        <div className="home-features-grid">
          <article className="home-feature">
            <span className="home-feature-icon" aria-hidden="true">✦</span>
            <h3>מבחר רחב</h3>
            <p>מאות מוצרים ממותגים מובילים בעולם</p>
          </article>
          <article className="home-feature">
            <span className="home-feature-icon" aria-hidden="true">◆</span>
            <h3>שירות מעולה</h3>
            <p>משלוחים מהירים ושירות לקוחות מקצועי</p>
          </article>
          <article className="home-feature">
            <span className="home-feature-icon" aria-hidden="true">●</span>
            <h3>מחירים הוגנים</h3>
            <p>מבצעים והנחות לחברים ברישום</p>
          </article>
        </div>
      </section>

      {/* הרשמה לניוזלטר — הכפתור מוביל לדף ההרשמה */}
      <section className="home-newsletter">
        <div className="home-newsletter-inner">
          <h2 className="home-newsletter-title">הצטרפו לרשימת התפוצה</h2>
          <p className="home-newsletter-desc">קבלו מבצעים והמלצות לפני כולם — הירשמו לאתר</p>
          <div className="home-newsletter-form">
            <input type="email" placeholder="האימייל שלכם" className="home-newsletter-input" readOnly aria-hidden="true" />
            <Link to="/register" className="home-newsletter-btn">הרשמה</Link>
          </div>
        </div>
      </section>

      {/* CTA תחתון */}
      <section className="home-cta">
        <p className="home-cta-text">מוכנים להתחיל?</p>
        <Link to="/products" className="home-cta-btn">גלו את המבחר</Link>
      </section>
    </div>
  );
}

export default Home;
