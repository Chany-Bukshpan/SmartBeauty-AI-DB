import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { useLocation } from 'react-router-dom';
import { sendContactUs } from '../api/userService';
import './SupportChat.css';

export default function SupportChat() {
  const location = useLocation();
  const contactStackRef = useRef(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sendingContact, setSendingContact] = useState(false);

  useLayoutEffect(() => {
    const hash = location.hash || '';
    if (!hash) return;
    const id = hash.replace('#', '');
    if (id === 'top') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }

    if (id === 'contact-us') {
      const trackEl = contactStackRef.current;
      if (trackEl) {
        const viewportH = window.innerHeight || 1;
        const trackTop = trackEl.getBoundingClientRect().top + window.scrollY;
        const maxScrollable = Math.max(0, trackEl.offsetHeight - viewportH);
        const y = trackTop + maxScrollable;

        const root = document.documentElement;
        const prev = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        window.scrollTo({ top: y, left: 0, behavior: 'auto' });
        root.style.scrollBehavior = prev;

        const panel = trackEl.querySelector('.contact-stack-panel');
        if (panel && window.innerWidth > 900) {
          panel.style.transform = 'translateY(0%)';
          panel.style.opacity = '1';
        }
      }
      return;
    }

    let cancelled = false;
    let tries = 0;

    const instantScrollToEl = (targetEl) => {
      const topOffset = 90;
      const y = targetEl.getBoundingClientRect().top + window.scrollY - topOffset;

      const root = document.documentElement;
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo({ top: Math.max(0, y), left: 0, behavior: 'auto' });
      root.style.scrollBehavior = prev;
    };

    const smoothScrollToEl = (targetEl) => {
      const topOffset = 90;
      const y = targetEl.getBoundingClientRect().top + window.scrollY - topOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    };

    const tick = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el) {
        smoothScrollToEl(el);
        return;
      }
      tries += 1;
      if (tries < 20) window.requestAnimationFrame(tick);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const trackEl = contactStackRef.current;
    if (!trackEl) return undefined;

    const panel = trackEl.querySelector('.contact-stack-panel');
    if (!panel) return undefined;

    let rafId = null;

    const updateStack = () => {
      if (window.innerWidth <= 900) {
        panel.style.transform = 'translateY(0%)';
        panel.style.opacity = '1';
        return;
      }

      const rect = trackEl.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const maxScrollable = Math.max(1, rect.height - viewportH);
      const currentScroll = Math.min(Math.max(-rect.top, 0), maxScrollable);
      const progress = currentScroll / maxScrollable;
      const t = Math.max(0, Math.min(1, progress));
      const translateY = (1 - t) * 100;
      panel.style.transform = `translateY(${translateY}%)`;
      panel.style.opacity = `${0.82 + t * 0.18}`;
    };

    const onViewportUpdate = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        updateStack();
        rafId = null;
      });
    };

    window.addEventListener('scroll', onViewportUpdate, { passive: true });
    window.addEventListener('resize', onViewportUpdate);
    updateStack();

    return () => {
      window.removeEventListener('scroll', onViewportUpdate);
      window.removeEventListener('resize', onViewportUpdate);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const submitContact = async () => {
    if (!fullName.trim() || !email.trim() || !subject.trim() || !contactMessage.trim()) {
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: { severity: 'warn', summary: 'Connect Us', detail: 'נא למלא את כל השדות בטופס.', life: 3000 },
        })
      );
      return;
    }
    try {
      setSendingContact(true);
      const res = await sendContactUs({
        fullName: fullName.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: contactMessage.trim(),
      });
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: {
            severity: 'success',
            summary: 'Connect Us',
            detail: res?.data?.message || 'הפנייה נשלחה בהצלחה.',
            life: 3200,
          },
        })
      );
      setSubject('');
      setContactMessage('');
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: {
            severity: 'error',
            summary: 'Connect Us',
            detail: err?.response?.data?.message || err?.message || 'שגיאה בשליחת הפנייה',
            life: 3600,
          },
        })
      );
    } finally {
      setSendingContact(false);
    }
  };

  return (
    <div className="support-chat-page">
      <section className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">SARA & CHANI - CONNECT US</div>
          <h1>
            מגוון רחב של
            <br />
            מוצרי איפור
            <em> ממותגים מובילים</em>
          </h1>
          <p className="hero-sub">
            Sara & Chani מרכזת עבורך מוצרי איפור איכותיים במקום אחד,
            עם קטגוריות מגוונות והתאמה נוחה לצרכים שונים.
          </p>
          <div className="hero-actions">
            <a href="#contact-us" className="btn-primary">צרי קשר</a>
            <a href="#about-us" className="btn-ghost">הסיפור שלנו</a>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-stats">
            <div className="stat-box"><div className="stat-num">8K<em>+</em></div><div className="stat-label">לקוחות</div></div>
            <div className="stat-box"><div className="stat-num">320<em>+</em></div><div className="stat-label">מוצרים</div></div>
            <div className="stat-box"><div className="stat-num">3<em>+</em></div><div className="stat-label">שנות ניסיון</div></div>
          </div>
        </div>
      </section>

      <div className="marquee-strip">
        <div className="marquee-track">
          <span className="marquee-item">100% טבעוני</span>
          <span className="marquee-item">ללא ניסויים בבעלי חיים</span>
          <span className="marquee-item">משלוח עד הבית</span>
          <span className="marquee-item">ייעוץ אישי חינם</span>
          <span className="marquee-item">מותגים מובילים בעולם</span>
          <span className="marquee-item">100% טבעוני</span>
          <span className="marquee-item">ללא ניסויים בבעלי חיים</span>
          <span className="marquee-item">משלוח עד הבית</span>
        </div>
      </div>

      <section id="about-us" className="about">
            <div className="about-visual">
              <div className="about-visual-bg" />
              <div className="about-visual-num">SC</div>
              <div className="about-quote-card">
                <blockquote>אנחנו מתמקדות באיכות מוצרים, מגוון מותגים ושירות ברור שמקל על בחירה נכונה.</blockquote>
                <div className="about-quote-sig">מייסדות Sara & Chani</div>
              </div>
            </div>
            <div className="about-content">
              <div className="section-label">הסיפור שלנו</div>
              <h2>מקום אחד ל־<em>מוצרי איפור ומותגים</em></h2>
              <p>
                Sara & Chani נבנתה כדי לאפשר רכישה פשוטה, מסודרת ונוחה של מוצרי איפור למגוון צרכים.
              </p>
              <p>אצלנו תמצאי מותגים מוכרים, מבחר גוונים רחב וקטגוריות ברורות שמקלות על התאמה אישית.</p>
              <p>המטרה שלנו היא לשלב איכות, זמינות ושירות מקצועי לאורך כל חוויית הקנייה.</p>
              <div className="about-divider" />
              <div className="about-features">
                <div className="feature-pill">100% טבעוני</div>
                <div className="feature-pill">ללא ניסויים</div>
                <div className="feature-pill">משלוח מהיר</div>
                <div className="feature-pill">ייעוץ חינם</div>
              </div>
            </div>
      </section>

      <div className="contact-stack-track" ref={contactStackRef}>
        <div className="contact-stack-sticky">
          <section className="values-wrap values-base-panel">
            <div className="values-top">
              <div>
                <div className="section-label">הערכים שלנו</div>
                <h2>מה שמניע <em>אותנו</em></h2>
              </div>
              <div className="values-top-sub">שישה עקרונות שמנחים כל החלטה, כל מוצר וכל שירות.</div>
            </div>
            <div className="values-grid">
              <div className="val-card"><div className="val-num">01</div><h3>איכות ללא פשרות</h3><p>בחירה קפדנית של כל מוצר.</p></div>
              <div className="val-card"><div className="val-num">02</div><h3>יופי אמיתי</h3><p>לחגוג את הייחודיות שלך.</p></div>
              <div className="val-card"><div className="val-num">03</div><h3>אכפתיות לסביבה</h3><p>מותגים אחראיים וללא ניסויים.</p></div>
              <div className="val-card"><div className="val-num">04</div><h3>שירות אישי</h3><p>מענה חם ואישי לכל לקוחה.</p></div>
              <div className="val-card"><div className="val-num">05</div><h3>מחירים הוגנים</h3><p>איכות גבוהה במחיר נגיש.</p></div>
              <div className="val-card"><div className="val-num">06</div><h3>קהילה ותמיכה</h3><p>אנחנו איתך לאורך כל הדרך.</p></div>
            </div>
          </section>

          <section id="contact-us" className="contact-wrap contact-wrap--image contact-stack-panel">
            <div className="contact-left">
              <div className="section-label">צרי קשר</div>
              <h2>נשמח <em>לשמוע ממך</em></h2>
              <p>שאלה על מוצר? צריכה עזרה בבחירה? אנחנו כאן ונחזור אלייך בהקדם.</p>
              <div className="contact-items">
                <div className="ci"><span className="ci-label">כתובת</span><span className="ci-val">רחוב דיזנגוף 120, תל אביב</span></div>
                <div className="ci"><span className="ci-label">אימייל</span><span className="ci-val">cosmeticstore1342@gmail.com</span></div>
                <div className="ci"><span className="ci-label">טלפון / ווטסאפ</span><span className="ci-val">050-411-0076</span></div>
                <div className="ci"><span className="ci-label">שעות פעילות</span><span className="ci-val">א׳–ה׳ | 09:00–20:00</span></div>
              </div>
            </div>
            <div className="contact-form-box">
              <div className="form-head">
                <h3 className="form-head-title">שלחי לנו <em>הודעה</em></h3>
                <p className="form-head-sub">נחזור אלייך תוך 24 שעות לכל היותר.</p>
              </div>
              <div className="cu-contact-form">
                <div className="f-row">
                  <input placeholder="שם מלא" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  <input placeholder="אימייל" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <input placeholder="נושא הפנייה" value={subject} onChange={(e) => setSubject(e.target.value)} />
                <textarea
                  placeholder="איך נוכל לעזור לך?"
                  rows={5}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                />
                <Button type="button" label={sendingContact ? 'שולח...' : 'שליחה למייל האתר'} onClick={submitContact} disabled={sendingContact} />
              </div>
            </div>
          </section>
        </div>
      </div>

    </div>
  );
}
