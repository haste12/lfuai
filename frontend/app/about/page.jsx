'use client';
import Navbar from '../../components/layout/Navbar';
import styles from './page.module.css';

const team = [
  { name: 'Dr. Abdulkadir Nakshbandi', role: 'President, LFU', emoji: '🏛️' },
  { name: 'Mr. Ahmad Najat Afandi', role: 'Head of IT Department', emoji: '💻' },
  { name: 'Dr. Saman Saeed Hussein', role: 'Head of Computer Engineering', emoji: '⚙️' },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div
          className="glow-orb"
          style={{ width: 500, height: 500, background: 'rgba(124,106,247,0.08)', top: 0, right: -100 }}
        />

        {/* Hero */}
        <section className={styles.hero}>
          <p className={styles.eyebrow}>About Us</p>
          <h1 className={styles.title}>
            Lebanese French <span className="gradient-text">University</span>
          </h1>
          <p className={styles.desc}>
            LFU is a leading private university in the Kurdistan Region of Iraq, dedicated to
            excellence in education, research, and innovation. Our AI Assistant is built by LFU
            students to modernize the way students access university information.
          </p>
        </section>

        {/* Mission */}
        <section className={styles.missionGrid}>
          {[
            { icon: '🎯', title: 'Our Mission', text: 'To empower students with instant, accurate access to university resources and information through cutting-edge AI technology.' },
            { icon: '🌐', title: 'Our Vision', text: 'Building a digital-first university experience that prepares students for a technology-driven world.' },
            { icon: '💡', title: 'Innovation', text: 'Developed by LFU students as a real-world AI application, combining OpenAI GPT with Firebase and modern web technologies.' },
          ].map(({ icon, title, text }) => (
            <div key={title} className={styles.missionCard}>
              <span className={styles.missionIcon}>{icon}</span>
              <h3 className={styles.missionTitle}>{title}</h3>
              <p className={styles.missionText}>{text}</p>
            </div>
          ))}
        </section>

        {/* Team */}
        <section className={styles.team}>
          <h2 className={styles.sectionTitle}>University Leadership</h2>
          <div className={styles.teamGrid}>
            {team.map(({ name, role, emoji }) => (
              <div key={name} className={styles.teamCard}>
                <div className={styles.teamEmoji}>{emoji}</div>
                <h3 className={styles.teamName}>{name}</h3>
                <p className={styles.teamRole}>{role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tech stack */}
        <section className={styles.techSection}>
          <h2 className={styles.sectionTitle}>Powered By</h2>
          <div className={styles.techGrid}>
            {['Next.js 14', 'Express.js', 'Firebase', 'OpenAI GPT-3.5', 'React', 'Node.js'].map((tech) => (
              <div key={tech} className={styles.techBadge}>{tech}</div>
            ))}
          </div>
          <p className={styles.credit}>
            Built with ❤️ by LFU Students · Designed by{' '}
            <a href="https://hastemuhsin.netlify.app/" target="_blank" rel="noopener noreferrer" className={styles.creditLink}>
              Haste Mohsin
            </a>
          </p>
        </section>
      </main>
    </>
  );
}
