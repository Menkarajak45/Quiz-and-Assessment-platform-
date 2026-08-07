import { Link, NavLink, useNavigate } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, History, Trophy, BookOpen, Users, FolderOpen, ClipboardList, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const studentLinks = [
  { to: '/quizzes', label: 'Quizzes', icon: BookOpen },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/history', label: 'History', icon: History },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/quizzes', label: 'Quizzes', icon: BookOpen },
  { to: '/admin/users', label: 'Students', icon: Users },
  { to: '/admin/categories', label: 'Categories', icon: FolderOpen },
  { to: '/admin/attempts', label: 'Attempts', icon: ClipboardList },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

function NavLinkItem({ link, mobile }) {
    return (
    <NavLink
      key={link.to}
      to={link.to}
      className={({ isActive }) =>
        `inline-flex items-center gap-2 rounded-lg font-medium transition-colors ${
          mobile ? 'px-3 py-2 text-sm' : 'px-3 py-2 text-sm'
        } ${isActive ? 'bg-[rgba(107,91,147,0.06)] text-[var(--purple)]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
      }
    >
      <link.icon className="w-4 h-4" />
      {link.label}
    </NavLink>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = user?.role === 'admin' ? adminLinks : studentLinks;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="brand-badge flex items-center justify-center rounded-2xl shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <p className="text-base font-semibold text-slate-900 tracking-tight">QuizMaster</p>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Quiz platform</p>
            </div>
          </Link>

          {user && (
            <nav className="hidden lg:flex items-center gap-1">
              {links.map((link) => (
                <NavLinkItem key={link.to} link={link} />
              ))}
            </nav>
          )}

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold" style={{background: 'rgba(107,91,147,0.08)', color: 'var(--purple)'}}>
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="leading-tight">
                    <p className="text-sm font-medium text-slate-900">{user.name}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                      {user.role}
                    </p>
                  </div>
                </div>
                <button onClick={handleLogout} className="btn-secondary !px-3" title="Logout">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary">
                Login
              </Link>
            )}
          </div>
        </div>

        {user && (
          <nav className="lg:hidden flex gap-1 overflow-x-auto pb-3 -mx-4 px-4">
            {links.map((link) => (
              <NavLinkItem key={link.to} link={link} mobile />
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
