import React, { useState, useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Navigation from './components/Navigation';
import Profile from './components/Profile';
import Charity from './components/Charity';
import Rating from './components/Rating';
import Support from './components/Support';
import Rules from './components/Rules';
import PostDetail from './components/PostDetail';
import './App.css';

// Вспомогательные функции для работы с localStorage
const getFromLocalStorage = (key) => {
  const data = localStorage.getItem(key);
  if (!data) return null;
  
  try {
    // Пытаемся распарсить как JSON
    return JSON.parse(data);
  } catch (e) {
    // Если не JSON, возвращаем как есть (обычная строка)
    return data;
  }
};

const saveToLocalStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Функция для создания ripple эффекта
const createRipple = (e, button) => {
  if (!button || button.classList.contains('ripple')) return;
  
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  const rect = button.getBoundingClientRect();
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${e.clientX - rect.left - radius}px`;
  circle.style.top = `${e.clientY - rect.top - radius}px`;
  circle.classList.add('ripple');

  const ripple = button.getElementsByClassName('ripple')[0];
  if (ripple) {
    ripple.remove();
  }

  button.appendChild(circle);
  
  circle.addEventListener('animationend', () => {
    circle.remove();
  });
  
  setTimeout(() => {
    if (circle.parentNode) {
      circle.remove();
    }
  }, 600);
};

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [selectedPost, setSelectedPost] = useState(null);
  const [isLightTheme, setIsLightTheme] = useState(false);
  // Проверяем наличие helperName при инициализации для показа вкладки Рейтинг
  const getInitialShowRatingTab = () => {
    const { getStorageItem, getSavedPhone } = require('./utils/storage');
    const phone = getSavedPhone();
    const helperName = getStorageItem('helperName', phone);
    const shouldShow = !!(helperName && helperName.trim() !== '');
    console.log('Инициализация showRatingTab:', { helperName, shouldShow, phone });
    return shouldShow;
  };
  const [showRatingTab, setShowRatingTab] = useState(getInitialShowRatingTab);
  const { posts, loadPosts } = useApp();
  const containerRef = useRef(null);

  // Загрузка темы из localStorage
  useEffect(() => {
    const savedTheme = getFromLocalStorage('theme');
    if (savedTheme === 'light') {
      setIsLightTheme(true);
      document.body.classList.add('light-theme');
    } else {
      setIsLightTheme(false);
      document.body.classList.remove('light-theme');
    }
  }, []);

  // Загрузка постов при монтировании (только один раз)
  useEffect(() => {
    loadPosts(true); // force = true для первой загрузки
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Пустой массив зависимостей - выполнится только при монтировании

  // Проверка наличия helperName для показа вкладки Рейтинг
  useEffect(() => {
    const { getStorageItem, getSavedPhone } = require('./utils/storage');
    const checkHelperName = () => {
      const phone = getSavedPhone();
      const helperName = getStorageItem('helperName', phone);
      const shouldShow = !!(helperName && helperName.trim() !== '');
      console.log('Проверка helperName для вкладки Рейтинг:', { helperName, shouldShow, phone });
      setShowRatingTab(shouldShow);
    };
    
    // Проверяем при монтировании
    checkHelperName();
    
    // Слушаем изменения в localStorage
    const handleStorageChange = () => {
      checkHelperName();
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Также слушаем кастомное событие для обновления в том же окне
    window.addEventListener('storage', handleStorageChange);
    
    // Проверяем каждые 500мс на изменения (для обновления в том же окне)
    const interval = setInterval(checkHelperName, 500);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Переключение темы
  const handleThemeToggle = (isLight) => {
    setIsLightTheme(isLight);
    if (isLight) {
      document.body.classList.add('light-theme');
      saveToLocalStorage('theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      saveToLocalStorage('theme', 'dark');
    }
  };

  // Обработка открытия поста
  const handleOpenPost = (post) => {
    setSelectedPost(post);
  };

  // Обработка закрытия поста
  const handleClosePost = () => {
    setSelectedPost(null);
    document.body.style.overflow = 'auto';
  };

  // Обработка переключения вкладок
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // Ripple эффект для интерактивных элементов
  useEffect(() => {
    const handleClick = (e) => {
      // Пропускаем клики на ripple элементы
      if (e.target.classList.contains('ripple') || e.target.closest('.ripple')) {
        return;
      }

      // Пропускаем клики на неинтерактивные элементы
      if (e.target.tagName === 'SPAN' || e.target.tagName === 'P' || 
          e.target.tagName === 'H1' || e.target.tagName === 'H2' || 
          e.target.tagName === 'H3' || e.target.tagName === 'H4' ||
          e.target.tagName === 'SVG' || e.target.tagName === 'PATH' || 
          e.target.tagName === 'LINE' || e.target.tagName === 'CIRCLE' || 
          e.target.tagName === 'POLYLINE' || e.target.tagName === 'POLYGON') {
        const parent = e.target.closest('.nav-item, button, .post-card, .support-category, .support-solution, .rule-card, .leaderboard-item');
        if (parent && !parent.disabled && !parent.classList.contains('ripple')) {
          if (!parent.classList.contains('content-section') && 
              !parent.classList.contains('support-container') && 
              !parent.classList.contains('rules-container') && 
              !parent.classList.contains('rating-container')) {
            createRipple(e, parent);
          }
        }
        return;
      }

      // Находим ближайший интерактивный элемент
      const target = e.target.closest('.nav-item, button, .post-card, .support-category, .support-solution, .rule-card, .leaderboard-item, .upload-button, .submit-button, .support-btn, .support-chat-send-btn');
      
      if (!target || target.disabled) {
        return;
      }

      // Не применяем ripple к контейнерам
      if (target.classList.contains('content-section') || 
          target.classList.contains('support-container') || 
          target.classList.contains('rules-container') || 
          target.classList.contains('rating-container') ||
          target.classList.contains('card') ||
          target.classList.contains('main-content') ||
          target.classList.contains('support-categories')) {
        return;
      }

      createRipple(e, target);
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // Рендеринг контента в зависимости от активной вкладки
  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <Profile isLightTheme={isLightTheme} onThemeToggle={handleThemeToggle} />;
      case 'charity':
        return <Charity onOpenPost={handleOpenPost} />;
      case 'rating':
        return <Rating />;
      case 'info':
        return <Support />;
      case 'rules':
        return <Rules />;
      default:
        return <Profile isLightTheme={isLightTheme} onThemeToggle={handleThemeToggle} />;
    }
  };

  return (
    <div className="container" ref={containerRef}>
      <div className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">Меню</h2>
        </div>
        <Navigation activeTab={activeTab} onTabChange={handleTabChange} showRatingTab={showRatingTab} />
      </div>
      
      <div className="card">
        {renderContent()}
      </div>
      
      {selectedPost && (
        <PostDetail
          post={selectedPost}
          isOpen={!!selectedPost}
          onClose={handleClosePost}
        />
      )}
    </div>
  );
};

const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
