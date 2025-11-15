import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { apiClient, refreshApiClient, updateToken } from '../api/client';
import { updateToken as updateTokenConfig } from '../api/config';
import { setCurrentPhone, clearUserDataForPhone, getStorageItem, setStorageItem, getSavedPhone } from '../utils/storage';

const Profile = ({ isLightTheme, onThemeToggle }) => {
  const { userProfile, loading, loadProfile, loadChats } = useApp();
  const [showModal, setShowModal] = useState(!localStorage.getItem('token'));
  const [authMode, setAuthMode] = useState('login'); // 'login' или 'register'
  
  // Данные для входа
  const [loginData, setLoginData] = useState({
    phone: '',
    password: ''
  });
  
  // Данные для регистрации
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    photo: null
  });
  
  const [photoPreview, setPhotoPreview] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  // Флаг для отслеживания, были ли данные восстановлены
  const dataRestoredRef = useRef(false);
  
  // Данные профиля для отображения
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    photo: null
  });

  // Загрузка данных профиля из API при монтировании и при открытии экрана
  useEffect(() => {
    // Загружаем профиль из API, если есть токен
    const token = localStorage.getItem('token');
    if (token) {
      loadProfile();
    }
  }, [loadProfile]); // Загружаем профиль при монтировании и при изменении loadProfile
  
  // Восстановление данных из localStorage при монтировании компонента (при переключении вкладок)
  useEffect(() => {
    const phone = getSavedPhone();
    if (phone && !dataRestoredRef.current) {
      const savedProfileData = getStorageItem('userProfileData', phone);
      if (savedProfileData) {
        console.log('Восстановлены данные профиля из localStorage для телефона:', phone, savedProfileData);
        
        // Обрабатываем фото URL, если это относительный путь
        let photoUrl = savedProfileData.photo || null;
        if (photoUrl && !photoUrl.startsWith('http') && !photoUrl.startsWith('data:')) {
          const apiBaseUrl = 'http://82.202.142.141:8080/api/v1';
          const cleanPath = photoUrl.startsWith('/') ? photoUrl.substring(1) : photoUrl;
          photoUrl = `${apiBaseUrl}/${cleanPath}`;
        }
        
        // Восстанавливаем все сохраненные данные, включая аватарку и пароль
        setFormData({
          firstName: savedProfileData.firstName || '',
          lastName: savedProfileData.lastName || '',
          phone: savedProfileData.phone || phone,
          password: savedProfileData.password || '',
          photo: savedProfileData.photo || null
        });
        
        if (photoUrl) {
          setPhotoPreview(photoUrl);
        }
        
        dataRestoredRef.current = true;
      }
    }
  }, []); // Выполняется при каждом монтировании компонента
  
  // Заполнение формы данными из API (только если нет сохраненных данных)
  useEffect(() => {
    // Если данные уже восстановлены из localStorage, не перезаписываем их
    if (dataRestoredRef.current) {
      return;
    }
    
    if (userProfile) {
      const phone = userProfile.phone || getSavedPhone();
      
      // Устанавливаем номер телефона, если его еще нет
      if (userProfile.phone) {
        setCurrentPhone(userProfile.phone);
      }
      
      // Извлекаем имя и фамилию из API
      let firstName = '';
      let lastName = '';
      
      if (userProfile.first_name) {
        firstName = userProfile.first_name;
      } else if (userProfile.name) {
        const nameParts = userProfile.name.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      if (userProfile.last_name) {
        lastName = userProfile.last_name;
      }
      
      // Получаем фото из API (photo_url уже обработан в loadProfile, но проверяем и другие поля для совместимости)
      let photoUrl = userProfile.photo_url || userProfile.avatar || userProfile.photo || null;
      
      // Если photo_url еще не обработан (для совместимости со старыми данными), обрабатываем его
      if (photoUrl && !photoUrl.startsWith('http') && !photoUrl.startsWith('data:')) {
        const baseUrl = 'http://82.202.142.141:8080';
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
      
      // Проверяем, есть ли сохраненные данные
      const savedProfileData = getStorageItem('userProfileData', phone);
      
      // Обновляем форму данными из API, но сохраняем пароль из localStorage, если он есть
      setFormData({
        firstName: firstName,
        lastName: lastName,
        phone: userProfile.phone || phone || '',
        password: savedProfileData?.password || '', // Сохраняем пароль из localStorage
        photo: null // File объект не сохраняем, только URL
      });
      
      // Устанавливаем превью фото из API, если нет сохраненного
      if (photoUrl && !savedProfileData?.photo) {
        // Загружаем фото по ссылке
        setPhotoPreview(photoUrl);
        console.log('Загружено фото из API:', photoUrl);
      } else if (savedProfileData?.photo) {
        // Используем сохраненное фото, если оно есть
        setPhotoPreview(savedProfileData.photo);
      } else {
        setPhotoPreview(null);
      }
      
      // Сохраняем данные в localStorage, но не перезаписываем пароль и фото, если они уже есть
      if (phone) {
        const profileDataToSave = {
          firstName: firstName,
          lastName: lastName,
          phone: userProfile.phone || phone,
          password: savedProfileData?.password || '', // Сохраняем существующий пароль
          photo: savedProfileData?.photo || photoUrl || null // Сохраняем существующее фото или из API
        };
        setStorageItem('userProfileData', profileDataToSave, phone);
        console.log('Сохранены данные профиля из API для телефона:', phone, 'photo_url:', photoUrl);
      }
      
      dataRestoredRef.current = true;
    }
  }, [userProfile, loadProfile]);

  // Функция для очистки всех данных пользователя из localStorage (теперь не используется, данные сохраняются по номеру)
  // const clearUserData = () => { ... } - удалена, так как данные теперь привязаны к номеру телефона

  // Проверка токена при монтировании
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setShowModal(false);
    }
    
    // НЕ сбрасываем флаг восстановления данных, чтобы при переключении вкладок данные сохранялись
    // dataRestoredRef.current будет сброшен только при логине/регистрации
  }, []); // Выполняется только при монтировании

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      // Нормализуем номер телефона для сравнения
      const normalizedNewPhone = loginData.phone.replace(/\D/g, '');
      const previousPhone = getSavedPhone();
      const normalizedPreviousPhone = previousPhone ? previousPhone.replace(/\D/g, '') : null;
      
      // Если номер телефона изменился, очищаем данные предыдущего пользователя
      if (normalizedPreviousPhone && normalizedPreviousPhone !== normalizedNewPhone) {
        console.log('Обнаружен новый пользователь, очищаем данные предыдущего:', normalizedPreviousPhone);
        clearUserDataForPhone(previousPhone);
        localStorage.removeItem('currentPhone');
        localStorage.removeItem('userProfile');
      }
      
      const response = await apiClient.authLoginPost({
        phone: loginData.phone,
        password: loginData.password,
      });

      if (response.data && response.data.token) {
        updateToken(response.data.token);
        refreshApiClient();
        
        // Сохраняем номер телефона для привязки данных ПЕРЕД загрузкой профиля
        setCurrentPhone(loginData.phone);
        
        // Сбрасываем флаг восстановления данных, чтобы useEffect мог обновить данные из API
        dataRestoredRef.current = false;
        
        await loadProfile();
        await loadChats();
        
        setShowModal(false);
      }
    } catch (err) {
      console.error('Ошибка входа:', err);
      setAuthError(
        err.response?.data?.error?.message || 
        err.message || 
        'Ошибка входа. Проверьте телефон и пароль.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      // Нормализуем номер телефона для сравнения
      const normalizedNewPhone = registerData.phone.replace(/\D/g, '');
      const previousPhone = getSavedPhone();
      const normalizedPreviousPhone = previousPhone ? previousPhone.replace(/\D/g, '') : null;
      
      // Если номер телефона изменился, очищаем данные предыдущего пользователя
      if (normalizedPreviousPhone && normalizedPreviousPhone !== normalizedNewPhone) {
        console.log('Обнаружен новый пользователь при регистрации, очищаем данные предыдущего:', normalizedPreviousPhone);
        clearUserDataForPhone(previousPhone);
        localStorage.removeItem('currentPhone');
        localStorage.removeItem('userProfile');
      }
      
      const response = await apiClient.authRegisterPost({
        first_name: registerData.firstName,
        last_name: registerData.lastName || '',
        phone: registerData.phone,
        password: registerData.password,
      });

      if (response.data) {
        // Сохраняем номер телефона для привязки данных ПЕРЕД сохранением данных
        setCurrentPhone(registerData.phone);
        
        // Сохраняем фото, если оно было выбрано
        const photoToSave = photoPreview || null;
        
        // Сохраняем данные профиля в localStorage с привязкой к номеру телефона
        const profileData = {
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          phone: registerData.phone,
          password: registerData.password,
          photo: photoToSave // Сохраняем фото, если оно было выбрано
        };
        
        // Сохраняем с привязкой к номеру телефона
        setStorageItem('userProfileData', profileData, registerData.phone);
        console.log('Сохранены данные профиля при регистрации для телефона:', registerData.phone, profileData);
        
        // Также сохраняем в обычный userProfile для обратной совместимости
        localStorage.setItem('userProfile', JSON.stringify(profileData));
        
        // Автоматически входим после регистрации
        const loginResponse = await apiClient.authLoginPost({
          phone: registerData.phone,
          password: registerData.password,
        });

        if (loginResponse.data && loginResponse.data.token) {
          updateToken(loginResponse.data.token);
          refreshApiClient();
          
          // Сбрасываем флаг восстановления данных, чтобы useEffect мог обновить данные из API
          dataRestoredRef.current = false;
          
          await loadProfile();
          await loadChats();
          
          setShowModal(false);
        }
      }
    } catch (err) {
      console.error('Ошибка регистрации:', err);
      setAuthError(
        err.response?.data?.error?.message || 
        err.message || 
        'Ошибка регистрации. Проверьте введенные данные.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const photoData = event.target.result;
        setPhotoPreview(photoData);
        setRegisterData(prev => ({ ...prev, photo: photoData }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoginInputChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegisterInputChange = (e) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneInput = (e, isRegister = false) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 0) {
      if (value[0] !== '7') {
        value = '7' + value;
      }
      let formatted = '+7';
      if (value.length > 1) {
        formatted += ' (' + value.substring(1, 4);
      }
      if (value.length >= 5) {
        formatted += ') ' + value.substring(4, 7);
      }
      if (value.length >= 8) {
        formatted += '-' + value.substring(7, 9);
      }
      if (value.length >= 10) {
        formatted += '-' + value.substring(9, 11);
      }
      
      if (isRegister) {
        setRegisterData(prev => ({ ...prev, phone: formatted }));
      } else {
        setLoginData(prev => ({ ...prev, phone: formatted }));
      }
    } else {
      if (isRegister) {
        setRegisterData(prev => ({ ...prev, phone: '' }));
      } else {
        setLoginData(prev => ({ ...prev, phone: '' }));
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Автоматически сохраняем изменения с привязкой к номеру телефона
      const phone = getSavedPhone() || updated.phone;
      if (phone) {
        const profileDataToSave = {
          ...updated,
          photo: photoPreview || null
        };
        setStorageItem('userProfileData', profileDataToSave, phone);
      }
      
      return updated;
    });
  };

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const photoData = event.target.result;
        setPhotoPreview(photoData);
        // Сохраняем и File объект, и base64 строку
        const updatedFormData = { ...formData, photo: file, photoBase64: photoData };
        setFormData(updatedFormData);
        
        // Сохраняем с привязкой к номеру телефона
        const phone = getSavedPhone() || formData.phone;
        if (phone) {
          const profileDataToSave = {
            ...updatedFormData,
            photo: photoData // Для localStorage сохраняем base64
          };
          setStorageItem('userProfileData', profileDataToSave, phone);
          console.log('Сохранена аватарка для телефона:', phone);
        }
        
        // Также сохраняем в обычный userProfile для обратной совместимости
        localStorage.setItem('userProfile', JSON.stringify({ ...updatedFormData, photo: photoData }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePhoneInput = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 0) {
      if (value[0] !== '7') {
        value = '7' + value;
      }
      let formatted = '+7';
      if (value.length > 1) {
        formatted += ' (' + value.substring(1, 4);
      }
      if (value.length >= 5) {
        formatted += ') ' + value.substring(4, 7);
      }
      if (value.length >= 8) {
        formatted += '-' + value.substring(7, 9);
      }
      if (value.length >= 10) {
        formatted += '-' + value.substring(9, 11);
      }
      setFormData(prev => ({ ...prev, phone: formatted }));
    } else {
      setFormData(prev => ({ ...prev, phone: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Обновляем профиль на бэкенде
      const updateRequest = {
        first_name: formData.firstName,
        last_name: formData.lastName
      };
      
      const response = await apiClient.usersMePatch(updateRequest);
      
      // Если есть фото, загружаем его отдельно
      if (photoPreview) {
        let photoFile = null;
        
        // Если formData.photo - это File, используем его
        if (formData.photo instanceof File) {
          photoFile = formData.photo;
        } 
        // Если photoPreview - это base64 строка, преобразуем в File
        else if (typeof photoPreview === 'string' && photoPreview.startsWith('data:')) {
          try {
            // Преобразуем base64 в blob, затем в File
            const base64Response = await fetch(photoPreview);
            const blob = await base64Response.blob();
            photoFile = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
          } catch (err) {
            console.error('Ошибка преобразования фото:', err);
          }
        }
        
        if (photoFile instanceof File) {
          await apiClient.usersMePhotoPost(photoFile);
        }
      }
      
      // Обновляем профиль из ответа API
      if (response.data) {
        await loadProfile();
      }
      
      const phone = getSavedPhone() || formData.phone;
      const profileData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        password: formData.password, // Сохраняем пароль
        photo: photoPreview || null // Сохраняем фото (может быть base64 или URL)
      };

      // Сохраняем с привязкой к номеру телефона
      if (phone) {
        setStorageItem('userProfileData', profileData, phone);
        console.log('Сохранен профиль для телефона:', phone, profileData);
      }
      
      // Также сохраняем в обычный userProfile для обратной совместимости
      localStorage.setItem('userProfile', JSON.stringify(profileData));
      
      // Обновляем флаг, чтобы данные не перезаписывались при следующем рендере
      dataRestoredRef.current = true;
      
      // Убираем alert, так как данные уже сохранены на бэкенде
      // alert('Профиль сохранен!');
    } catch (err) {
      console.error('Ошибка сохранения профиля:', err);
      alert(
        err.response?.data?.error?.message || 
        err.message || 
        'Ошибка при сохранении профиля. Попробуйте еще раз.'
      );
    }
  };

  const handleLogout = () => {
    // Получаем текущий номер телефона перед очисткой
    const currentPhone = getSavedPhone();
    
    // Очищаем все данные пользователя для этого номера телефона
    if (currentPhone) {
      clearUserDataForPhone(currentPhone);
    }
    
    // Очищаем текущий номер телефона
    localStorage.removeItem('currentPhone');
    
    // Удаляем токен из localStorage и обновляем конфигурацию API
    localStorage.removeItem('token');
    updateTokenConfig(null);
    refreshApiClient();
    
    // Очищаем общие данные профиля (для обратной совместимости)
    localStorage.removeItem('userProfile');
    
    // Очищаем состояние формы профиля
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
      photo: null
    });
    setPhotoPreview(null);
    
    // Показываем модальное окно входа
    setShowModal(true);
    setAuthMode('login');
    
    // Очищаем форму входа
    setLoginData({ phone: '', password: '' });
    setAuthError(null);
    
    // Триггерим событие для обновления других компонентов
    window.dispatchEvent(new Event('currentPhoneChanged'));
  };

  // Если показываем модальное окно
  if (showModal) {
    return (
      <>
        <div className="auth-modal active">
          <div className="auth-modal-content">
            <div className="auth-tabs">
              <button
                className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('login');
                  setAuthError(null);
                }}
              >
                Вход
              </button>
              <button
                className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('register');
                  setAuthError(null);
                }}
              >
                Авторизация
              </button>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="auth-form">
                <div className="form-group">
                  <label htmlFor="loginPhone">Номер телефона</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <input
                      type="tel"
                      id="loginPhone"
                      name="phone"
                      placeholder="+7 (___) ___-__-__"
                      value={loginData.phone}
                      onChange={(e) => handlePhoneInput(e, false)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="loginPassword">Пароль</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <input
                      type="password"
                      id="loginPassword"
                      name="password"
                      placeholder="Введите пароль"
                      value={loginData.password}
                      onChange={handleLoginInputChange}
                      required
                    />
                  </div>
                </div>

                {authError && (
                  <div className="auth-error">{authError}</div>
                )}

                <button type="submit" className="submit-button" disabled={authLoading}>
                  {authLoading ? 'Вход...' : 'Войти'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="auth-form">
                <div className="photo-section">
                  <div className="photo-wrapper">
                    <div className="photo-preview">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" />
                      ) : (
                        <svg viewBox="0 0 24 24">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      )}
                    </div>
                    <label htmlFor="registerPhotoInput" className="upload-button">
                      <svg viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                    </label>
                    <input
                      type="file"
                      id="registerPhotoInput"
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />
                  </div>
                  <p className="photo-hint">Нажмите, чтобы загрузить фото</p>
                </div>

                <div className="form-group">
                  <label htmlFor="registerFirstName">Имя *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <input
                      type="text"
                      id="registerFirstName"
                      name="firstName"
                      placeholder="Введите ваше имя"
                      value={registerData.firstName}
                      onChange={handleRegisterInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="registerLastName">Фамилия</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <input
                      type="text"
                      id="registerLastName"
                      name="lastName"
                      placeholder="Введите вашу фамилию"
                      value={registerData.lastName}
                      onChange={handleRegisterInputChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="registerPhone">Номер телефона *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <input
                      type="tel"
                      id="registerPhone"
                      name="phone"
                      placeholder="+7 (___) ___-__-__"
                      value={registerData.phone}
                      onChange={(e) => handlePhoneInput(e, true)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="registerPassword">Пароль *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <input
                      type="password"
                      id="registerPassword"
                      name="password"
                      placeholder="Введите пароль"
                      value={registerData.password}
                      onChange={handleRegisterInputChange}
                      required
                    />
                  </div>
                </div>

                {authError && (
                  <div className="auth-error">{authError}</div>
                )}

                <button type="submit" className="submit-button" disabled={authLoading}>
                  {authLoading ? 'Регистрация...' : 'Сохранить'}
                </button>
              </form>
            )}
          </div>
        </div>
        <div className="content-section active" style={{ display: 'none' }}></div>
      </>
    );
  }

  // Отображение профиля
  return (
    <div className="content-section active" id="profile">
      <div className="header">
        <div className="icon-wrapper">
          <svg className="user-icon" viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <h1>Профиль</h1>
        <p className="subtitle">Заполните информацию о себе</p>
        <button className="logout-button" onClick={handleLogout} title="Выйти">
          <svg viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>

      <form id="profileForm" onSubmit={handleSubmit}>
        <div className="photo-section">
          <div className="photo-wrapper">
            <div className="photo-preview" id="photoPreview">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" />
              ) : (
                <svg viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              )}
            </div>
            <label htmlFor="photoInput" className="upload-button">
              <svg viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </label>
            <input 
              type="file" 
              id="photoInput" 
              accept="image/*"
              onChange={handleProfilePhotoChange}
            />
          </div>
          <p className="photo-hint">Нажмите, чтобы загрузить фото</p>
        </div>

        <div className="form-group">
          <label htmlFor="firstName">Имя</label>
          <div className="input-wrapper">
            <svg className="input-icon" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <input 
              type="text" 
              id="firstName" 
              name="firstName"
              placeholder="Введите ваше имя"
              value={formData.firstName}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Фамилия</label>
          <div className="input-wrapper">
            <svg className="input-icon" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <input 
              type="text" 
              id="lastName" 
              name="lastName"
              placeholder="Введите вашу фамилию"
              value={formData.lastName}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="phone">Номер телефона</label>
          <div className="input-wrapper">
            <svg className="input-icon" viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            <input 
              type="tel" 
              id="phone" 
              name="phone"
              placeholder="+7 (___) ___-__-__"
              value={formData.phone}
              onChange={handleProfilePhoneInput}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="password">Пароль</label>
          <div className="input-wrapper">
            <svg className="input-icon" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <input 
              type="password" 
              id="password" 
              name="password"
              placeholder="Введите пароль"
              value={formData.password}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <button type="submit" className="submit-button">Сохранить</button>
      </form>

      <div className="footer">
        <p className="footer-text">
          Нажимая "Сохранить", вы соглашаетесь с условиями использования
        </p>
      </div>
    </div>
  );
};

export default Profile;
