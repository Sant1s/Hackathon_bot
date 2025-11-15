import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { apiClient, refreshApiClient } from '../api/client';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);
  const [helperName, setHelperName] = useState('');
  const [userPost, setUserPost] = useState(null);
  const [verificationData, setVerificationData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Защита от частых запросов
  const lastLoadTimeRef = useRef(0);
  const isLoadingRef = useRef(false);
  const MIN_REQUEST_INTERVAL = 5000; // Минимум 5 секунд между запросами

  // Загрузка постов с защитой от частых запросов
  const loadPosts = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Если уже идет загрузка, не делаем новый запрос
    if (isLoadingRef.current && !force) {
      return;
    }
    
    // Если прошло меньше MIN_REQUEST_INTERVAL с последнего запроса, не делаем новый
    if (!force && (now - lastLoadTimeRef.current) < MIN_REQUEST_INTERVAL) {
      return;
    }
    
    try {
      isLoadingRef.current = true;
      lastLoadTimeRef.current = now;
      setLoading(true);
      
      const response = await apiClient.postsGet();
      let postsData = [];
      
      if (response.data && response.data.data) {
        postsData = response.data.data;
      } else if (response.data) {
        // Если данные в другом формате
        postsData = Array.isArray(response.data) ? response.data : [];
      }
      
      // Логируем первые данные для отладки
      if (postsData.length > 0) {
        console.log('Пример данных поста из API:', postsData[0]);
        console.log('Поля изображений:', {
          images: postsData[0].images,
          media: postsData[0].media,
          image: postsData[0].image,
          photo: postsData[0].photo
        });
        console.log('Поля автора:', {
          author: postsData[0].author,
          user: postsData[0].user
        });
      }
      
      // Преобразуем данные постов для правильного отображения изображений и аватаров
      const transformedPosts = postsData.map((post, index) => {
        // Обрабатываем изображения: проверяем разные возможные поля
        let images = [];
        
        // Проверяем все возможные поля для изображений
        if (post.images && Array.isArray(post.images) && post.images.length > 0) {
          images = post.images;
        } else if (post.media && Array.isArray(post.media) && post.media.length > 0) {
          images = post.media;
        } else if (post.attachments && Array.isArray(post.attachments) && post.attachments.length > 0) {
          images = post.attachments;
        } else if (post.files && Array.isArray(post.files) && post.files.length > 0) {
          images = post.files;
        } else if (post.image) {
          images = Array.isArray(post.image) ? post.image : [post.image];
        } else if (post.photo) {
          images = Array.isArray(post.photo) ? post.photo : [post.photo];
        } else if (post.thumbnail) {
          images = [post.thumbnail];
        }
        
        // Логируем для первого поста
        if (index === 0) {
          console.log('Обработка изображений для первого поста:', {
            postId: post.id,
            imagesRaw: post.images,
            mediaRaw: post.media,
            attachmentsRaw: post.attachments,
            filesRaw: post.files,
            imageRaw: post.image,
            photoRaw: post.photo,
            thumbnailRaw: post.thumbnail,
            imagesAfterFirstCheck: images
          });
        }
        
        // Если изображения - это объекты с URL, извлекаем URL
        if (images.length > 0) {
          images = images.map(img => {
            if (typeof img === 'object' && img !== null) {
              // Проверяем разные возможные поля в объекте (media_url - приоритетное поле для API)
              return img.media_url || img.url || img.path || img.src || img.link || img.file || img.media || null;
            }
            return img;
          }).filter(img => img !== null && img !== undefined); // Удаляем null значения
        }
        
        // Если изображения - это строки, но относительные пути, преобразуем в полные URL
        const baseUrl = 'http://82.202.142.141:8080';
        images = images.map(img => {
          if (typeof img === 'string' && img.trim() !== '') {
            // Если это относительный путь, добавляем базовый URL
            if (img.startsWith('/')) {
              return baseUrl + img;
            }
            // Если это полный URL, оставляем как есть
            if (img.startsWith('http://') || img.startsWith('https://')) {
              return img;
            }
            // Если это просто имя файла, добавляем базовый URL
            return baseUrl + '/api/v1/' + img;
          }
          return img;
        }).filter(img => img && typeof img === 'string' && img.trim() !== '');
        
        // Логируем результат для первого поста
        if (index === 0) {
          console.log('Изображения после обработки URL:', images);
        }
        
        // Обрабатываем аватар автора: проверяем разные возможные поля
        let authorAvatar = null;
        let authorName = null;
        
        if (post.author) {
          authorAvatar = post.author.avatar || post.author.photo || post.author.image || null;
          authorName = post.author.name || 
                      (post.author.firstName && post.author.lastName 
                        ? `${post.author.firstName} ${post.author.lastName}` 
                        : null) ||
                      post.author.username || null;
        } else if (post.user) {
          authorAvatar = post.user.avatar || post.user.photo || post.user.image || null;
          authorName = post.user.name || 
                      (post.user.firstName && post.user.lastName 
                        ? `${post.user.firstName} ${post.user.lastName}` 
                        : null) ||
                      post.user.username || null;
        }
        
        // Если аватар - это объект с URL, извлекаем URL
        if (authorAvatar && typeof authorAvatar === 'object' && authorAvatar.url) {
          authorAvatar = authorAvatar.url;
        }
        
        // Если аватар - это относительный путь, преобразуем в полный URL
        if (authorAvatar && typeof authorAvatar === 'string') {
          const baseUrl = 'http://82.202.142.141:8080';
          if (authorAvatar.startsWith('/')) {
            authorAvatar = baseUrl + authorAvatar;
          } else if (!authorAvatar.startsWith('http://') && !authorAvatar.startsWith('https://')) {
            authorAvatar = baseUrl + '/api/v1/' + authorAvatar;
          }
        }
        
        return {
          ...post,
          images: images,
          author: post.author ? {
            ...post.author,
            avatar: authorAvatar,
            name: authorName
          } : (post.user ? {
            avatar: authorAvatar,
            name: authorName
          } : null),
          // Для обратной совместимости
          image: images.length > 0 ? images[0] : null,
          avatar: authorAvatar
        };
      });
      
      setPosts(transformedPosts);
      setError(null);
    } catch (err) {
      console.error('Ошибка загрузки постов:', err);
      const errorMessage = err.response 
        ? `Ошибка ${err.response.status}: ${err.response.statusText || err.message}`
        : err.message || 'Не удалось загрузить посты. Проверьте подключение к серверу.';
      setError(errorMessage);
      // Не устанавливаем ошибку как критическую, просто логируем
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  // Загрузка профиля пользователя
  const loadProfile = useCallback(async () => {
    // Проверяем наличие токена перед запросом
    const token = localStorage.getItem('token');
    if (!token || token.trim() === '') {
      // Если токена нет или он пустой, не делаем запрос
      return;
    }
    
    try {
      const response = await apiClient.usersMeGet();
      let profileData = response.data;
      
      // Обрабатываем photo_url для правильного отображения фото
      if (profileData && profileData.photo_url) {
        let photoUrl = profileData.photo_url;
        const baseUrl = 'http://82.202.142.141:8080';
        
        // Если photo_url - это относительный путь, добавляем базовый URL
        if (!photoUrl.startsWith('http') && !photoUrl.startsWith('data:')) {
          // Для файлов просто добавляем базовый URL без /api/v1
          if (photoUrl.startsWith('/files')) {
            photoUrl = baseUrl + photoUrl;
          }
          // Если путь уже содержит /api/v1, добавляем только базовый URL
          else if (photoUrl.startsWith('/api/v1')) {
            photoUrl = baseUrl + photoUrl;
          }
          // Для остальных путей тоже просто добавляем базовый URL (без /api/v1)
          else {
            // Убеждаемся, что путь начинается с /
            const cleanPath = photoUrl.startsWith('/') ? photoUrl : '/' + photoUrl;
            photoUrl = baseUrl + cleanPath;
          }
        }
        
        // Обновляем photo_url в данных профиля
        profileData = {
          ...profileData,
          photo_url: photoUrl
        };
      }
      
      setUserProfile(profileData);
      if (profileData && profileData.name) {
        setHelperName(profileData.name);
      }
    } catch (err) {
      // Если ошибка 401, значит токен невалидный или истек - очищаем его
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        setUserProfile(null);
        // Не логируем ошибку 401, так как это нормальная ситуация для неавторизованных пользователей
        return;
      } else {
        console.error('Ошибка загрузки профиля:', err);
      }
    }
  }, []);

  // Загрузка чатов
  const loadChats = useCallback(async () => {
    // Проверяем наличие токена перед запросом
    const token = localStorage.getItem('token');
    if (!token) {
      // Если токена нет, не делаем запрос
      return;
    }
    
    try {
      const response = await apiClient.chatsGet();
      if (response.data && response.data.data) {
        setChats(response.data.data);
      } else if (response.data) {
        setChats(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      // Если ошибка 401, значит токен невалидный или истек - очищаем его
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        setChats([]);
        console.log('Токен невалидный или истек, чаты не загружены');
      } else {
        console.error('Ошибка загрузки чатов:', err);
      }
    }
  }, []);

  // Загрузка данных при монтировании
  useEffect(() => {
    // Обновляем клиент с токеном из localStorage
    refreshApiClient();
    
    // loadPosts вызывается из App.jsx при монтировании, чтобы избежать дублирования
    // Загружаем профиль и чаты только если есть валидный токен
    const token = localStorage.getItem('token');
    if (token && token.trim() !== '') {
      // Вызываем асинхронно, но не ждем результата
      loadProfile().catch(err => {
        // Ошибка уже обработана в loadProfile
      });
      loadChats().catch(err => {
        // Ошибка уже обработана в loadChats
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Пустой массив - выполнится только при монтировании

  const value = {
    posts,
    setPosts,
    helperName,
    setHelperName,
    userPost,
    setUserPost,
    verificationData,
    setVerificationData,
    userProfile,
    setUserProfile,
    chats,
    setChats,
    loading,
    error,
    loadPosts,
    loadProfile,
    loadChats,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

