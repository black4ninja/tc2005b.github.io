import { Outlet } from 'react-router';
import Navbar from './Navbar';
import Footer from './Footer';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
