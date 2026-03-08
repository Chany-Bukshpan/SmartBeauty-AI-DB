import { useState, useEffect } from 'react';
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

function Home() {
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTaglineIndex((i) => (i + 1) % TAGLINES.length), 3200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSlideIndex((i) => (i + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(t);
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

      {/* הירו ראשי — טיפוגרפיה בולטת, רקע עשיר */}
      <section className="home-hero" aria-label="כניסה">
        <div className="hero-bg-pattern" aria-hidden="true" />
        <div className="hero-blob hero-blob-1" aria-hidden="true" />
        <div className="hero-blob hero-blob-2" aria-hidden="true" />
        <div className="hero-blob hero-blob-3" aria-hidden="true" />
        <div className="hero-content">
          <p className="hero-badge">חנות האיפור המקוונת</p>
          <h1 className="hero-headline">
            <span className="hero-headline-main">האיפור שלך.</span>
            <span className="hero-headline-accent">המקום שלנו.</span>
          </h1>
          <div className="hero-tagline-box">
            <p className="hero-tagline" key={taglineIndex}>
              {TAGLINES[taglineIndex]}
            </p>
          </div>
          <p className="hero-desc">
            מגוון מוצרי איפור ממיטב המותגים — משלוח עד הבית, שירות אדיב ומחירים משתלמים.
          </p>
          <Link to="/products" className="hero-btn">
            <span>לגלות את המוצרים</span>
          </Link>
          <a href="#features" className="hero-scroll" aria-label="גלול למטה">
            <span>גלול לגלות</span>
            <span className="hero-scroll-ico">↓</span>
          </a>
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

      {/* בלוק יתרונות — כרטיסים מעוצבים */}
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

      {/* CTA תחתון */}
      <section className="home-cta">
        <p className="home-cta-text">מוכנים להתחיל?</p>
        <Link to="/products" className="home-cta-btn">גלו את המבחר</Link>
      </section>
    </div>
  );
}

export default Home;
