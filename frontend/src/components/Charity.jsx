import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { apiClient } from '../api/client';
import { getStorageItem, setStorageItem, removeStorageItem, getSavedPhone } from '../utils/storage';

const Charity = ({ onOpenPost }) => {
  const { posts, loading, loadPosts } = useApp();
  // Получаем номер телефона для привязки данных
  const getPhone = () => {
    return getSavedPhone() || null;
  };
  
  // Инициализируем mode из localStorage, если есть сохраненное значение
  const getInitialMode = () => {
    const phone = getPhone();
    if (!phone) {
      // Если номера еще нет, возвращаем 'initial', но потом восстановим из localStorage
      return 'initial';
    }
    const savedMode = getStorageItem('charityMode', phone);
    return savedMode || 'initial';
  };
  const [mode, setMode] = useState(getInitialMode); // 'initial', 'passport', 'verifying', 'createPost', 'processing', 'viewPost', 'posts', 'userPost', 'needHelp'
  const [createdPost, setCreatedPost] = useState(null); // Данные созданного поста
  // Восстанавливаем helperName из localStorage при инициализации
  const getInitialHelperName = () => {
    const phone = getPhone();
    const savedHelperName = getStorageItem('helperName', phone);
    return savedHelperName || '';
  };
  const [helperName, setHelperName] = useState(getInitialHelperName);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptProcessing, setShowReceiptProcessing] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptFileName, setReceiptFileName] = useState('');
  const receiptFileInputRef = useRef(null);
  const receiptUploadAreaRef = useRef(null);
  const postsToShow = posts && posts.length > 0 ? posts : [];
  
  // Данные для формы паспорта
  const [passportData, setPassportData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    passportSeries: '',
    passportNumber: '',
    birthDate: '',
    issuedBy: '',
    issueDate: '',
    docType: 'inn', // 'inn' или 'snils'
    inn: '',
    snils: '',
    passportScans: []
  });
  const [passportScansPreview, setPassportScansPreview] = useState([]);
  const [passportLoading, setPassportLoading] = useState(false);
  const [passportError, setPassportError] = useState(null);
  
  // Данные для формы создания поста (для "Я хочу помочь")
  const [helperPostData, setHelperPostData] = useState({
    avatar: null,
    firstName: '',
    lastName: '',
    title: '',
    description: '',
    amount: '',
    media: []
  });
  const [helperPostMediaPreview, setHelperPostMediaPreview] = useState([]);
  const [helperPostAvatarPreview, setHelperPostAvatarPreview] = useState(null);
  const [helperPostLoading, setHelperPostLoading] = useState(false);
  const [helperPostError, setHelperPostError] = useState(null);
  
  // Данные для формы создания поста
  const [postFormData, setPostFormData] = useState({
    title: '',
    description: '',
    amount: '',
    recipient: '',
    bank: '',
    phone: '',
    media: null
  });
  const [postMediaPreview, setPostMediaPreview] = useState([]);
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState(null);

  useEffect(() => {
    // Восстанавливаем дополнительные данные из localStorage при монтировании компонента
    const phone = getPhone();
    if (!phone) {
      // Если номера еще нет, ждем его появления
      const checkPhone = setInterval(() => {
        const currentPhone = getPhone();
        if (currentPhone) {
          clearInterval(checkPhone);
          // Восстанавливаем mode сначала
          const savedMode = getStorageItem('charityMode', currentPhone);
          if (savedMode && savedMode !== 'initial') {
            setMode(savedMode);
            console.log('Восстановлен режим после получения номера телефона:', savedMode);
          }
          // Восстанавливаем данные после получения номера
          restoreDataForPhone(currentPhone);
        }
      }, 100);
      return () => clearInterval(checkPhone);
    }
    
    restoreDataForPhone(phone);
  }, [mode]); // Запускаем при изменении mode, чтобы восстановить данные при восстановлении режима
  
  // Функция для восстановления данных для конкретного номера телефона
  const restoreDataForPhone = (phone) => {
    const savedMode = getStorageItem('charityMode', phone);
    const savedHelperName = getStorageItem('helperName', phone);
    
    console.log('Восстановление дополнительных данных Charity:', { savedMode, savedHelperName, currentMode: mode, phone });
    
    // Если был режим "Я хочу помочь" (intro или posts), восстанавливаем имя
    if ((mode === 'intro' || mode === 'posts') || savedMode === 'intro' || savedMode === 'posts') {
      if (savedHelperName) {
        setHelperName(savedHelperName);
        console.log('Восстановлено имя:', savedHelperName);
      }
    }
    
    // Если был режим "Мне нужна помощь", восстанавливаем данные
    const modeToCheck = savedMode || mode;
    if (['passport', 'verifying', 'createPost', 'viewPost', 'processing'].includes(modeToCheck)) {
      // Восстанавливаем данные паспорта
      const savedPassportData = getStorageItem('passportData', phone);
      if (savedPassportData) {
        try {
          setPassportData(savedPassportData);
          const savedScans = getStorageItem('passportScansPreview', phone);
          if (savedScans) {
            setPassportScansPreview(savedScans);
          }
          console.log('Восстановлены данные паспорта');
        } catch (e) {
          console.error('Ошибка восстановления данных паспорта:', e);
        }
      }
      
      // Если был режим viewPost, восстанавливаем созданный пост
      if (modeToCheck === 'viewPost') {
        const savedCreatedPost = getStorageItem('createdPostData', phone);
        if (savedCreatedPost) {
          try {
            setCreatedPost(savedCreatedPost);
            setHelperPostData({
              avatar: savedCreatedPost.avatar,
              firstName: savedCreatedPost.firstName,
              lastName: savedCreatedPost.lastName,
              title: savedCreatedPost.title,
              description: savedCreatedPost.description,
              amount: savedCreatedPost.amount,
              media: savedCreatedPost.media || []
            });
            if (savedCreatedPost.images && savedCreatedPost.images.length > 0) {
              setHelperPostMediaPreview(savedCreatedPost.images);
            }
            if (savedCreatedPost.avatar) {
              setHelperPostAvatarPreview(savedCreatedPost.avatar);
            }
            if (savedMode && savedMode !== mode) {
              setMode(savedMode);
            }
            console.log('Восстановлен созданный пост');
          } catch (e) {
            console.error('Ошибка восстановления поста:', e);
          }
        }
      }
      
      // Если был режим createPost, восстанавливаем данные формы
      if (modeToCheck === 'createPost') {
        const savedPostData = getStorageItem('helperPostData', phone);
        if (savedPostData) {
          try {
            setHelperPostData(savedPostData);
            const savedMedia = getStorageItem('helperPostMediaPreview', phone);
            if (savedMedia) {
              setHelperPostMediaPreview(savedMedia);
            }
            const savedAvatar = getStorageItem('helperPostAvatarPreview', phone);
            if (savedAvatar) {
              setHelperPostAvatarPreview(savedAvatar);
            }
            if (savedMode && savedMode !== mode) {
              setMode(savedMode);
            }
            console.log('Восстановлены данные формы создания поста');
          } catch (e) {
            console.error('Ошибка восстановления данных поста:', e);
          }
        }
      }
      
      // Если был режим posts или intro, восстанавливаем режим
      if (savedMode && savedMode !== mode && ['posts', 'intro'].includes(savedMode)) {
        setMode(savedMode);
      }
    }
    
    // Если есть сохраненный режим, но текущий режим - initial, восстанавливаем сохраненный
    if (savedMode && savedMode !== 'initial' && mode === 'initial') {
      setMode(savedMode);
      console.log('Восстановлен режим из сохраненного:', savedMode);
    }
  };
  
  // Восстанавливаем helperName при монтировании и при изменении номера телефона
  useEffect(() => {
    const phone = getPhone();
    if (!phone) {
      // Если номера еще нет, ждем его появления
      const checkPhone = setInterval(() => {
        const currentPhone = getPhone();
        if (currentPhone) {
          clearInterval(checkPhone);
          const savedHelperName = getStorageItem('helperName', currentPhone);
          if (savedHelperName && savedHelperName.trim() !== '') {
            setHelperName(savedHelperName);
            console.log('Восстановлен helperName после получения номера телефона:', savedHelperName);
          }
        }
      }, 100);
      return () => clearInterval(checkPhone);
    }
    
    const savedHelperName = getStorageItem('helperName', phone);
    if (savedHelperName && savedHelperName.trim() !== '') {
      setHelperName(savedHelperName);
      console.log('Восстановлен helperName при монтировании:', savedHelperName, 'для телефона:', phone);
    }
  }, []); // Выполняется только при монтировании
  
  // Восстанавливаем данные при изменении номера телефона (слушаем изменения в localStorage)
  useEffect(() => {
    const handleStorageChange = () => {
      const phone = getPhone();
      if (phone) {
        // Восстанавливаем mode
        const savedMode = getStorageItem('charityMode', phone);
        if (savedMode && savedMode !== mode) {
          setMode(savedMode);
          console.log('Восстановлен режим из storage:', savedMode);
        }
        
        // Восстанавливаем helperName
        const savedHelperName = getStorageItem('helperName', phone);
        if (savedHelperName && savedHelperName !== helperName) {
          setHelperName(savedHelperName);
          console.log('Восстановлен helperName из storage:', savedHelperName);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Также слушаем кастомное событие для обновления в том же окне
    window.addEventListener('currentPhoneChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('currentPhoneChanged', handleStorageChange);
    };
  }, [mode, helperName]);
  
  // Сохраняем mode в localStorage при его изменении
  const isFirstRender = useRef(true);
  
  useEffect(() => {
    // Пропускаем сохранение при первом рендере, чтобы избежать перезаписи восстановленного состояния
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    const phone = getPhone();
    // Не сохраняем 'initial' в localStorage
    if (mode && mode !== 'initial') {
      console.log('Сохранение режима в localStorage:', mode, 'для телефона:', phone);
      setStorageItem('charityMode', mode, phone);
    } else if (mode === 'initial') {
      // Удаляем сохраненный режим только если явно установлен 'initial'
      removeStorageItem('charityMode', phone);
    }
  }, [mode]);


  const handleWantToHelp = () => {
    setMode('intro');
    // Сохранение произойдет автоматически через useEffect
  };

  const handleNeedHelp = async () => {
    const phone = getPhone();
    // Удаляем helperName, чтобы скрыть вкладку Рейтинг для тех, кому нужна помощь
    removeStorageItem('helperName', phone);
    window.dispatchEvent(new Event('storage'));
    
    // Проверяем, есть ли сохраненные данные паспорта
    const savedPassportData = getStorageItem('passportData', phone);
    const savedMode = getStorageItem('charityMode', phone);
    
    // Если уже был сохраненный режим для "Мне нужна помощь", используем его
    if (savedMode && ['passport', 'verifying', 'createPost', 'viewPost', 'processing'].includes(savedMode)) {
      // Восстанавливаем состояние в зависимости от сохраненного режима
      if (savedMode === 'viewPost') {
        // Восстанавливаем просмотр поста
        const savedCreatedPost = getStorageItem('createdPostData', phone);
        if (savedCreatedPost) {
          try {
            const parsedPost = savedCreatedPost;
            setCreatedPost(parsedPost);
            setHelperPostData({
              avatar: parsedPost.avatar,
              firstName: parsedPost.firstName,
              lastName: parsedPost.lastName,
              title: parsedPost.title,
              description: parsedPost.description,
              amount: parsedPost.amount,
              media: parsedPost.media || []
            });
            if (parsedPost.images && parsedPost.images.length > 0) {
              setHelperPostMediaPreview(parsedPost.images);
            }
            if (parsedPost.avatar) {
              setHelperPostAvatarPreview(parsedPost.avatar);
            }
            setMode('viewPost');
            return;
          } catch (e) {
            console.error('Ошибка восстановления поста:', e);
          }
        }
      } else if (savedMode === 'createPost') {
        // Восстанавливаем форму создания поста
        if (savedPassportData) {
          try {
            setPassportData(savedPassportData);
            const savedScans = getStorageItem('passportScansPreview', phone);
            if (savedScans) {
              setPassportScansPreview(savedScans);
            }
            const savedPostData = getStorageItem('helperPostData', phone);
            if (savedPostData) {
              setHelperPostData(savedPostData);
              const savedMedia = getStorageItem('helperPostMediaPreview', phone);
              if (savedMedia) {
                setHelperPostMediaPreview(savedMedia);
              }
              const savedAvatar = getStorageItem('helperPostAvatarPreview', phone);
              if (savedAvatar) {
                setHelperPostAvatarPreview(savedAvatar);
              }
            }
            setMode('createPost');
            return;
          } catch (e) {
            console.error('Ошибка восстановления данных:', e);
          }
        }
      } else if (savedMode === 'passport') {
        // Восстанавливаем форму паспорта
        if (savedPassportData) {
          try {
            setPassportData(savedPassportData);
            const savedScans = getStorageItem('passportScansPreview', phone);
            if (savedScans) {
              setPassportScansPreview(savedScans);
            }
            setMode('passport');
            return;
          } catch (e) {
            console.error('Ошибка восстановления данных паспорта:', e);
          }
        }
      }
    }
    
    if (savedPassportData) {
      try {
        setPassportData(savedPassportData);
        // Восстанавливаем превью сканов
        const savedScans = getStorageItem('passportScansPreview', phone);
        if (savedScans) {
          setPassportScansPreview(savedScans);
        }
        // Если верификация уже пройдена, переходим к созданию поста или просмотру
        const verificationStatus = getStorageItem('verificationStatus', phone);
        if (verificationStatus === 'approved') {
          // Проверяем, есть ли созданный пост
          const savedCreatedPost = getStorageItem('createdPostData', phone);
          if (savedCreatedPost) {
            try {
              setCreatedPost(savedCreatedPost);
              setHelperPostData({
                avatar: savedCreatedPost.avatar,
                firstName: savedCreatedPost.firstName,
                lastName: savedCreatedPost.lastName,
                title: savedCreatedPost.title,
                description: savedCreatedPost.description,
                amount: savedCreatedPost.amount,
                media: savedCreatedPost.media || []
              });
              setMode('viewPost');
              // Восстанавливаем превью фотографий из сохраненного поста или из localStorage
              if (savedCreatedPost.images && savedCreatedPost.images.length > 0) {
                setHelperPostMediaPreview(savedCreatedPost.images);
              } else {
                const savedMedia = getStorageItem('helperPostMediaPreview', phone);
                if (savedMedia) {
                  try {
                    setHelperPostMediaPreview(savedMedia);
                  } catch (e) {
                    console.error('Ошибка восстановления превью фотографий:', e);
                  }
                }
              }
              // Восстанавливаем превью аватара
              if (savedCreatedPost.avatar) {
                setHelperPostAvatarPreview(savedCreatedPost.avatar);
              } else {
                const savedAvatar = getStorageItem('helperPostAvatarPreview', phone);
                if (savedAvatar) {
                  setHelperPostAvatarPreview(savedAvatar);
                }
              }
            } catch (e) {
              console.error('Ошибка загрузки созданного поста:', e);
              setMode('createPost');
            }
          } else {
            setMode('createPost');
            // Восстанавливаем данные поста если есть
            const savedPostData = getStorageItem('helperPostData', phone);
            if (savedPostData) {
              setHelperPostData(savedPostData);
              const savedMedia = getStorageItem('helperPostMediaPreview', phone);
              if (savedMedia) {
                setHelperPostMediaPreview(savedMedia);
              }
              const savedAvatar = getStorageItem('helperPostAvatarPreview', phone);
              if (savedAvatar) {
                setHelperPostAvatarPreview(savedAvatar);
              }
            }
          }
        } else {
          setMode('passport');
        }
      } catch (e) {
        console.error('Ошибка загрузки данных паспорта:', e);
        setMode('passport');
      }
    } else {
      setMode('passport');
    }
  };

  // Обработчики для формы паспорта
  const handlePassportInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // Обработка ИНН - только цифры, максимум 12
    if (name === 'inn') {
      processedValue = value.replace(/\D/g, '').slice(0, 12);
    }
    
    // Обработка СНИЛС - форматирование XXX-XXX-XXX XX
    if (name === 'snils') {
      let digits = value.replace(/\D/g, '').slice(0, 11);
      if (digits.length > 0) {
        let formatted = digits.slice(0, 3);
        if (digits.length > 3) {
          formatted += '-' + digits.slice(3, 6);
        }
        if (digits.length > 6) {
          formatted += '-' + digits.slice(6, 9);
        }
        if (digits.length > 9) {
          formatted += ' ' + digits.slice(9, 11);
        }
        processedValue = formatted;
      } else {
        processedValue = '';
      }
    }
    
    // Обработка серии паспорта - только цифры, максимум 4
    if (name === 'passportSeries') {
      processedValue = value.replace(/\D/g, '').slice(0, 4);
    }
    
    // Обработка номера паспорта - только цифры, максимум 6
    if (name === 'passportNumber') {
      processedValue = value.replace(/\D/g, '').slice(0, 6);
    }
    
    const phone = getPhone();
    setPassportData(prev => {
      const updated = { ...prev, [name]: processedValue };
      // Сохраняем в localStorage
      setStorageItem('passportData', updated, phone);
      return updated;
    });
  };

  const handlePassportScansChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + passportScansPreview.length > 10) {
      alert('Можно загрузить максимум 10 файлов');
      return;
    }
    
    const newFiles = files.filter(file => {
      const maxSize = 200 * 1024; // 200 КБ
      if (file.size > maxSize) {
        alert(`Файл ${file.name} превышает 200 КБ. Пожалуйста, выберите файл меньшего размера.`);
        return false;
      }
      const allowedTypes = ['image/webp', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert(`Файл ${file.name} имеет неподдерживаемый формат. Используйте WebP или JPEG.`);
        return false;
      }
      return true;
    });

    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setPassportScansPreview(prev => [...prev, ...newPreviews]);
    setPassportData(prev => ({
      ...prev,
      passportScans: [...prev.passportScans, ...newFiles]
    }));
    
    // Сохраняем превью в localStorage
    const phone = getPhone();
    setStorageItem('passportScansPreview', [...passportScansPreview, ...newPreviews], phone);
  };

  const removePassportScan = (index) => {
    const phone = getPhone();
    const newPreviews = passportScansPreview.filter((_, i) => i !== index);
    const newFiles = passportData.passportScans.filter((_, i) => i !== index);
    setPassportScansPreview(newPreviews);
    setPassportData(prev => ({ ...prev, passportScans: newFiles }));
    setStorageItem('passportScansPreview', newPreviews, phone);
  };

  const handlePassportSubmit = async (e) => {
    e.preventDefault();
    setPassportLoading(true);
    setPassportError(null);

    try {
      // Валидация
      if (!passportData.firstName || !passportData.lastName) {
        throw new Error('Имя и фамилия обязательны для заполнения');
      }
      if (!passportData.passportSeries || !passportData.passportNumber) {
        throw new Error('Серия и номер паспорта обязательны');
      }
      const seriesDigits = passportData.passportSeries.replace(/\D/g, '');
      const numberDigits = passportData.passportNumber.replace(/\D/g, '');
      if (seriesDigits.length !== 4) {
        throw new Error('Серия паспорта должна содержать 4 цифры');
      }
      if (numberDigits.length !== 6) {
        throw new Error('Номер паспорта должен содержать 6 цифр');
      }
      if (!passportData.birthDate) {
        throw new Error('Дата рождения обязательна для заполнения');
      }
      // Проверка возраста (должно быть 18+)
      const birthDate = new Date(passportData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
      if (actualAge < 18) {
        throw new Error('Вам должно быть не менее 18 лет для создания поста');
      }
      if (!passportData.issuedBy) {
        throw new Error('Поле "Кем выдан" обязательно для заполнения');
      }
      if (!passportData.issueDate) {
        throw new Error('Поле "Когда выдан" обязательно для заполнения');
      }
      // Проверка, что дата выдачи не в будущем
      const issueDate = new Date(passportData.issueDate);
      if (issueDate > today) {
        throw new Error('Дата выдачи не может быть в будущем');
      }
      // Проверка, что дата выдачи не раньше даты рождения
      if (issueDate < birthDate) {
        throw new Error('Дата выдачи не может быть раньше даты рождения');
      }
      if (passportData.docType === 'inn') {
        if (!passportData.inn) {
          throw new Error('ИНН обязателен для заполнения');
        }
        const innDigits = passportData.inn.replace(/\D/g, '');
        if (innDigits.length !== 12) {
          throw new Error('ИНН должен содержать 12 цифр');
        }
      }
      if (passportData.docType === 'snils') {
        if (!passportData.snils) {
          throw new Error('СНИЛС обязателен для заполнения');
        }
        const snilsDigits = passportData.snils.replace(/\D/g, '');
        if (snilsDigits.length !== 11) {
          throw new Error('СНИЛС должен содержать 11 цифр');
        }
      }
      if (passportData.passportScans.length < 2) {
        throw new Error('Необходимо загрузить минимум 2 скана паспорта');
      }

      // Здесь будет вызов API для верификации
      // Пока что просто переходим к модальному окну проверки
      setMode('verifying');
      
             // Имитируем проверку (в реальности здесь будет вызов API)
             const phone = getPhone();
             setTimeout(() => {
               setStorageItem('verificationStatus', 'approved', phone);
               setMode('createPost');
             }, 3000); // 3 секунды для демонстрации
      
    } catch (err) {
      setPassportError(err.message || 'Ошибка при отправке данных');
    } finally {
      setPassportLoading(false);
    }
  };

  const handleHelperFormSubmit = (e) => {
    e.preventDefault();
    if (helperName.trim()) {
      const phone = getPhone();
      setStorageItem('helperName', helperName, phone);
      console.log('Сохранен helperName:', helperName, 'для телефона:', phone);
      setMode('posts');
      // Сохранение charityMode произойдет автоматически через useEffect
      // Триггерим событие для обновления вкладки Рейтинг
      window.dispatchEvent(new Event('storage'));
      // Также вызываем проверку напрямую через небольшой таймаут
      setTimeout(() => {
        window.dispatchEvent(new Event('storage'));
      }, 100);
    }
  };

  const handlePaymentDetails = () => {
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
  };

  const handleReceiptFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024; // 10 МБ
      if (file.size > maxSize) {
        alert('Размер файла превышает 10 МБ. Пожалуйста, выберите файл меньшего размера.');
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Неподдерживаемый формат файла. Пожалуйста, выберите JPG, PNG или PDF.');
        return;
      }
      setReceiptFile(file);
      setReceiptFileName(`Выбран файл: ${file.name}`);
    }
  };

  const handleReceiptUploadClick = () => {
    receiptFileInputRef.current?.click();
  };

  const handleReceiptSubmit = () => {
    if (!receiptFile) {
      alert('Пожалуйста, выберите файл чека');
      return;
    }
    setShowPaymentModal(false);
    setShowReceiptProcessing(true);
    // Здесь будет логика отправки чека на сервер
    setTimeout(() => {
      setShowReceiptProcessing(false);
      setReceiptFile(null);
      setReceiptFileName('');
    }, 3000);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (receiptUploadAreaRef.current) {
      receiptUploadAreaRef.current.style.borderColor = '#3b82f6';
      receiptUploadAreaRef.current.style.background = 'rgba(59, 130, 246, 0.1)';
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (receiptUploadAreaRef.current) {
      receiptUploadAreaRef.current.style.borderColor = '#334155';
      receiptUploadAreaRef.current.style.background = 'transparent';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (receiptUploadAreaRef.current) {
      receiptUploadAreaRef.current.style.borderColor = '#334155';
      receiptUploadAreaRef.current.style.background = 'transparent';
    }
    const file = e.dataTransfer.files[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('Размер файла превышает 10 МБ. Пожалуйста, выберите файл меньшего размера.');
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Неподдерживаемый формат файла. Пожалуйста, выберите JPG, PNG или PDF.');
        return;
      }
      setReceiptFile(file);
      setReceiptFileName(`Выбран файл: ${file.name}`);
    }
  };

  const generatePostId = (id) => {
    if (!id) return 'N/A';
    const str = String(id);
    return str.padStart(6, '0');
  };

  // Обработчики для формы создания поста (для "Я хочу помочь")
  const handleHelperPostInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // Для поля суммы - только цифры
    if (name === 'amount') {
      processedValue = value.replace(/\D/g, '');
    }
    
    const phone = getPhone();
    setHelperPostData(prev => ({ ...prev, [name]: processedValue }));
    // Сохраняем в localStorage
    const updated = { ...helperPostData, [name]: processedValue };
    setStorageItem('helperPostData', updated, phone);
  };

  const handleHelperPostAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 200 * 1024; // 200 КБ
      if (file.size > maxSize) {
        alert('Размер файла превышает 200 КБ. Пожалуйста, выберите файл меньшего размера.');
        return;
      }
      const allowedTypes = ['image/webp', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert('Неподдерживаемый формат файла. Используйте WebP или JPEG.');
        return;
      }
             const phone = getPhone();
             const preview = URL.createObjectURL(file);
             setHelperPostAvatarPreview(preview);
             setHelperPostData(prev => ({ ...prev, avatar: file }));
             setStorageItem('helperPostAvatarPreview', preview, phone);
    }
  };

  const handleHelperPostMediaChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + helperPostMediaPreview.length > 3) {
      alert('Можно загрузить максимум 3 файла');
      return;
    }
    
    const newFiles = files.filter(file => {
      const maxSize = 200 * 1024; // 200 КБ
      if (file.size > maxSize) {
        alert(`Файл ${file.name} превышает 200 КБ. Пожалуйста, выберите файл меньшего размера.`);
        return false;
      }
      const allowedTypes = ['image/webp', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert(`Файл ${file.name} имеет неподдерживаемый формат. Используйте WebP или JPEG.`);
        return false;
      }
      return true;
    });

           const phone = getPhone();
           const newPreviews = newFiles.map(file => URL.createObjectURL(file));
           setHelperPostMediaPreview(prev => [...prev, ...newPreviews]);
           setHelperPostData(prev => ({
             ...prev,
             media: [...prev.media, ...newFiles]
           }));
           setStorageItem('helperPostMediaPreview', [...helperPostMediaPreview, ...newPreviews], phone);
  };

  const removeHelperPostMedia = (index) => {
           const phone = getPhone();
           const newPreviews = helperPostMediaPreview.filter((_, i) => i !== index);
           const newFiles = helperPostData.media.filter((_, i) => i !== index);
           setHelperPostMediaPreview(newPreviews);
           setHelperPostData(prev => ({ ...prev, media: newFiles }));
           setStorageItem('helperPostMediaPreview', newPreviews, phone);
  };

  const handleHelperPostSubmit = async (e) => {
    e.preventDefault();
    console.log('handleHelperPostSubmit вызвана', helperPostData);
    setHelperPostLoading(true);
    setHelperPostError(null);

    try {
      // Валидация
      if (!helperPostData.firstName || !helperPostData.lastName) {
        throw new Error('Имя и фамилия обязательны');
      }
      if (!helperPostData.title) {
        throw new Error('Название обязательно');
      }
      if (!helperPostData.description) {
        throw new Error('Описание обязательно');
      }
      if (helperPostData.description.length > 10000) {
        throw new Error('Описание не должно превышать 10000 символов');
      }
      if (!helperPostData.amount || parseFloat(helperPostData.amount) <= 0) {
        throw new Error('Сумма сбора обязательна и должна быть больше 0');
      }
      
      // Проверяем, что amount - это валидное число
      const amountValue = parseFloat(helperPostData.amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error('Сумма сбора должна быть положительным числом');
      }

      // Показываем модальное окно обработки
      setMode('processing');
      
      const phone = getPhone();
      // Формируем recipient из имени и фамилии
      const recipient = `${helperPostData.firstName} ${helperPostData.lastName}`.trim();
      if (!recipient) {
        throw new Error('Получатель средств обязателен');
      }
      
      // Используем телефон из профиля или сохраненный телефон
      const userPhone = phone || '';
      if (!userPhone) {
        throw new Error('Телефон обязателен для создания поста');
      }
      
      // Банк - обязательное поле, используем значение по умолчанию, если не указан
      const bank = 'Не указан'; // Используем значение по умолчанию вместо пустой строки
      
      // Берем первый медиа файл (API принимает один файл, но можно расширить)
      const mediaFile = helperPostData.media && helperPostData.media.length > 0 
        ? helperPostData.media[0] 
        : undefined;
      
      // Проверяем, редактируем ли мы существующий пост
      const isEditing = createdPost !== null && createdPost.id;
      
      console.log('Отправка поста на бэкенд:', {
        isEditing,
        title: helperPostData.title,
        description: helperPostData.description,
        amount: parseFloat(helperPostData.amount),
        recipient,
        bank,
        phone: userPhone,
        hasMedia: !!mediaFile
      });
      
      let response;
      if (isEditing) {
        // Обновляем существующий пост
        console.log('Обновление поста с ID:', createdPost.id);
        response = await apiClient.postsIdPatch(
          createdPost.id,
          {
            title: helperPostData.title,
            description: helperPostData.description,
            amount: parseFloat(helperPostData.amount),
            recipient: recipient,
            bank: bank,
            phone: userPhone
          }
        );
      } else {
        // Создаем новый пост
        console.log('Создание нового поста');
        // Убеждаемся, что все строки не пустые и правильно отформатированы
        const title = helperPostData.title.trim();
        const description = helperPostData.description.trim();
        const amount = parseFloat(helperPostData.amount);
        
        console.log('Параметры для создания поста:', {
          title,
          description,
          amount,
          recipient,
          bank,
          phone: userPhone,
          hasMedia: !!mediaFile
        });
        
        response = await apiClient.postsPost(
          title,
          description,
          amount,
          recipient,
          bank,
          userPhone,
          mediaFile
        );
      }
      
      console.log('Ответ от API:', response);

      if (response && response.data) {
        console.log('Пост успешно создан/обновлен:', response.data);
        const postData = {
          id: isEditing ? createdPost.id : (response.data.id || Date.now()),
          ...helperPostData,
          createdAt: isEditing ? createdPost.createdAt : new Date().toISOString(),
          status: 'active',
          images: helperPostMediaPreview,
          avatar: helperPostAvatarPreview
        };
        setCreatedPost(postData);
        setStorageItem('helperPostCreated', 'true', phone);
        setStorageItem('createdPostData', postData, phone);
        // Также сохраняем превью отдельно для восстановления
        setStorageItem('helperPostMediaPreview', helperPostMediaPreview, phone);
        if (helperPostAvatarPreview) {
          setStorageItem('helperPostAvatarPreview', helperPostAvatarPreview, phone);
        }
        
        // Обновляем список постов
        await loadPosts(true);
        
        setMode('viewPost');
      } else {
        console.warn('Ответ от API не содержит данных:', response);
        throw new Error('Не удалось создать пост. Ответ от сервера пуст.');
      }
      
    } catch (err) {
      console.error('Ошибка создания поста:', err);
      console.error('Детали ошибки:', {
        message: err.message,
        response: err.response,
        data: err.response?.data
      });
      setHelperPostError(
        err.response?.data?.error?.message || 
        err.response?.data?.message ||
        err.message || 
        'Ошибка при создании поста. Проверьте введенные данные.'
      );
      // Возвращаемся к форме создания поста при ошибке
      setMode('createPost');
    } finally {
      setHelperPostLoading(false);
    }
  };

  const handlePostInputChange = (e) => {
    const { name, value } = e.target;
    setPostFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePostMediaChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 10) {
      alert('Можно загрузить максимум 10 файлов');
      return;
    }
    
    const previews = files.map(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`Файл ${file.name} превышает 10 МБ`);
        return null;
      }
      return URL.createObjectURL(file);
    }).filter(Boolean);
    
    setPostMediaPreview(previews);
    setPostFormData(prev => ({ ...prev, media: files[0] })); // Пока берем первый файл, можно расширить
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    setPostLoading(true);
    setPostError(null);

    try {
      const response = await apiClient.postsPost(
        postFormData.title,
        postFormData.description,
        parseFloat(postFormData.amount),
        postFormData.recipient,
        postFormData.bank,
        postFormData.phone,
        postFormData.media
      );

      if (response.data) {
        alert('Пост успешно создан!');
        // Убеждаемся, что helperName удален (для тех, кому нужна помощь)
        localStorage.removeItem('helperName');
        window.dispatchEvent(new Event('storage'));
        
        // Сбрасываем форму и возвращаемся к списку постов
        setPostFormData({
          title: '',
          description: '',
          amount: '',
          recipient: '',
          bank: '',
          phone: '',
          media: null
        });
        setPostMediaPreview([]);
        setMode('posts');
        // Обновляем список постов
        await loadPosts(true);
      }
    } catch (err) {
      console.error('Ошибка создания поста:', err);
      setPostError(
        err.response?.data?.error?.message || 
        err.message || 
        'Ошибка создания поста. Проверьте введенные данные.'
      );
    } finally {
      setPostLoading(false);
    }
  };

  return (
    <div className="content-section active" id="charity">
      <div className="header">
        <div className="header-content">
          <div className="icon-wrapper">
            <svg className="user-icon" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div>
            <h1>Благотворительность</h1>
            <p className="subtitle">Помогите тем, кто нуждается в поддержке</p>
          </div>
        </div>
      </div>

      {mode === 'initial' && (
        <div id="charityInitial">
          <div className="charity-buttons">
            <button className="charity-button" onClick={handleWantToHelp}>
              <svg viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              Я хочу помочь
            </button>
            <button className="charity-button" onClick={handleNeedHelp}>
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Мне нужна помощь
            </button>
          </div>
        </div>
      )}

      {/* Форма ввода имени для "Я хочу помочь" */}
      {mode === 'intro' && (
        <div id="introForm">
          <div className="intro-form">
            <h2>Представьтесь, пожалуйста</h2>
            <p>Чтобы продолжить, пожалуйста, представьтесь</p>
            <form id="helperForm" onSubmit={handleHelperFormSubmit}>
              <div className="form-group">
                <label htmlFor="helperName">Ваше имя</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <input 
                    type="text" 
                    id="helperName" 
                    placeholder="Введите ваше имя" 
                    required
                    value={helperName}
                    onChange={(e) => setHelperName(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="submit-button">Продолжить</button>
            </form>
          </div>
        </div>
      )}

      {/* Форма паспортных данных (для "Мне нужна помощь") */}
      {mode === 'passport' && (
        <div id="passportForm">
          <div className="intro-form">
            <h2>Верификация личности</h2>
            <p>Для создания поста необходимо пройти верификацию. Заполните данные паспорта</p>
            <form onSubmit={handlePassportSubmit}>
              <div className="form-group">
                <label htmlFor="firstName">Имя *</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    placeholder="Например: Иван"
                    value={passportData.firstName}
                    onChange={handlePassportInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Фамилия *</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    placeholder="Например: Иванов"
                    value={passportData.lastName}
                    onChange={handlePassportInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="middleName">Отчество</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <input
                    type="text"
                    id="middleName"
                    name="middleName"
                    placeholder="Например: Иванович (необязательно)"
                    value={passportData.middleName}
                    onChange={handlePassportInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="passportSeries">Серия паспорта *</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <input
                    type="text"
                    id="passportSeries"
                    name="passportSeries"
                    placeholder="Например: 1234"
                    value={passportData.passportSeries}
                    onChange={handlePassportInputChange}
                    required
                    maxLength="4"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="passportNumber">Номер паспорта *</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <input
                    type="text"
                    id="passportNumber"
                    name="passportNumber"
                    placeholder="Например: 123456"
                    value={passportData.passportNumber}
                    onChange={handlePassportInputChange}
                    required
                    maxLength="6"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="birthDate">Дата рождения *</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <input
                    type="date"
                    id="birthDate"
                    name="birthDate"
                    value={passportData.birthDate}
                    onChange={handlePassportInputChange}
                    required
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                  Вам должно быть не менее 18 лет
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="issuedBy">Кем выдан *</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <input
                    type="text"
                    id="issuedBy"
                    name="issuedBy"
                    placeholder="Например: УФМС России по г. Москве"
                    value={passportData.issuedBy}
                    onChange={handlePassportInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="issueDate">Когда выдан *</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <input
                    type="date"
                    id="issueDate"
                    name="issueDate"
                    value={passportData.issueDate}
                    onChange={handlePassportInputChange}
                    required
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Тип документа *</label>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="docType"
                      value="inn"
                      checked={passportData.docType === 'inn'}
                      onChange={handlePassportInputChange}
                    />
                    <span>ИНН</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="docType"
                      value="snils"
                      checked={passportData.docType === 'snils'}
                      onChange={handlePassportInputChange}
                    />
                    <span>СНИЛС</span>
                  </label>
                </div>
              </div>

              {passportData.docType === 'inn' && (
                <div className="form-group">
                  <label htmlFor="inn">ИНН *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    </svg>
                    <input
                      type="text"
                      id="inn"
                      name="inn"
                      placeholder="Например: 123456789012 (12 цифр)"
                      value={passportData.inn}
                      onChange={handlePassportInputChange}
                      required
                      maxLength="12"
                    />
                  </div>
                </div>
              )}

              {passportData.docType === 'snils' && (
                <div className="form-group">
                  <label htmlFor="snils">СНИЛС *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    </svg>
                    <input
                      type="text"
                      id="snils"
                      name="snils"
                      placeholder="Например: 123-456-789 01"
                      value={passportData.snils}
                      onChange={handlePassportInputChange}
                      required
                      maxLength="14"
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="passportScans">Сканы паспорта * (минимум 2)</label>
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="file"
                    id="passportScans"
                    multiple
                    accept="image/webp,image/jpeg,image/jpg"
                    onChange={handlePassportScansChange}
                    style={{ display: 'none' }}
                  />
                  <div
                    onClick={() => document.getElementById('passportScans').click()}
                    style={{
                      padding: '20px',
                      background: 'rgba(59, 130, 246, 0.05)',
                      border: '2px dashed #3b82f6',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                      e.currentTarget.style.borderColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                      e.currentTarget.style.borderColor = '#3b82f6';
                    }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: '32px', height: '32px', stroke: '#3b82f6', margin: '0 auto 12px', strokeWidth: '2', fill: 'none' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <div style={{ color: '#3b82f6', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                      + Загрузить сканы
                    </div>
                    <div style={{ color: '#64748b', fontSize: '12px', lineHeight: '1.6' }}>
                      <div style={{ marginBottom: '4px' }}>
                        <strong style={{ color: '#94a3b8' }}>Максимальный размер файла:</strong> 200 КБ
                      </div>
                      <div>
                        <strong style={{ color: '#94a3b8' }}>Формат:</strong> <span style={{ color: '#10b981' }}>WebP</span>, <span style={{ color: '#fbbf24' }}>JPEG</span>
                      </div>
                    </div>
                  </div>
                  {passportScansPreview.length > 0 && (
                    <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                      {passportScansPreview.map((preview, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                          <img
                            src={preview}
                            alt={`Скан ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '100px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid #334155'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removePassportScan(index)}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(239, 68, 68, 0.9)',
                              border: 'none',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {passportError && (
                <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '14px' }}>
                  {passportError}
                </div>
              )}

              <button type="submit" className="submit-button" disabled={passportLoading}>
                {passportLoading ? 'Отправка...' : 'Отправить на проверку'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно проверки верификации (для "Мне нужна помощь") */}
      {mode === 'verifying' && (
        <div className="verification-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '24px',
            padding: '48px',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 24px',
              border: '4px solid #3b82f6',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Проверяем данные</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Это займет 2-5 минут. Пожалуйста, подождите...
            </p>
            <button
              onClick={() => {
                localStorage.setItem('verificationStatus', 'approved');
                setMode('createPost');
              }}
              className="submit-button"
              style={{ marginTop: '24px' }}
            >
              ОК
            </button>
          </div>
        </div>
      )}

      {/* Форма создания поста (для "Мне нужна помощь") */}
      {mode === 'createPost' && (
        <div id="createPostForm">
          <div className="intro-form">
            <h2>{createdPost ? 'Редактировать пост' : 'Создать пост'}</h2>
            <p>{createdPost ? 'Измените информацию о вашем посте' : 'Заполните информацию о вашем посте'}</p>
            <form onSubmit={(e) => {
              console.log('Форма отправлена, вызываем handleHelperPostSubmit');
              handleHelperPostSubmit(e);
            }}>
              {/* Аватар */}
              <div className="form-group">
                <label>Аватар</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                  {helperPostAvatarPreview ? (
                    <img
                      src={helperPostAvatarPreview}
                      alt="Аватар"
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #334155'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '2px dashed #334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg viewBox="0 0 24 24" style={{ width: '32px', height: '32px', stroke: '#64748b' }}>
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                  )}
                  <div style={{ width: '100%' }}>
                    <input
                      type="file"
                      id="helperPostAvatar"
                      accept="image/webp,image/jpeg,image/jpg"
                      onChange={handleHelperPostAvatarChange}
                      style={{ display: 'none' }}
                    />
                    <div
                      onClick={() => document.getElementById('helperPostAvatar').click()}
                      style={{
                        padding: '16px',
                        background: 'rgba(59, 130, 246, 0.05)',
                        border: '2px dashed #3b82f6',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                        e.currentTarget.style.borderColor = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                        e.currentTarget.style.borderColor = '#3b82f6';
                      }}
                    >
                      <svg viewBox="0 0 24 24" style={{ width: '28px', height: '28px', stroke: '#3b82f6', margin: '0 auto 8px', strokeWidth: '2', fill: 'none' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      <div style={{ color: '#3b82f6', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                        {helperPostAvatarPreview ? 'Изменить фото' : 'Загрузить фото'}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '11px', lineHeight: '1.5' }}>
                        <div style={{ marginBottom: '2px' }}>
                          <strong style={{ color: '#94a3b8' }}>Макс. размер:</strong> 200 КБ
                        </div>
                        <div>
                          <strong style={{ color: '#94a3b8' }}>Формат:</strong> <span style={{ color: '#10b981' }}>WebP</span>, <span style={{ color: '#fbbf24' }}>JPEG</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Имя и фамилия */}
              <div className="form-group">
                <label htmlFor="helperPostFirstName">Имя *</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <input
                    type="text"
                    id="helperPostFirstName"
                    name="firstName"
                    placeholder="Введите имя"
                    value={helperPostData.firstName}
                    onChange={handleHelperPostInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="helperPostLastName">Фамилия *</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <input
                    type="text"
                    id="helperPostLastName"
                    name="lastName"
                    placeholder="Введите фамилию"
                    value={helperPostData.lastName}
                    onChange={handleHelperPostInputChange}
                    required
                  />
                </div>
              </div>

              {/* Название */}
              <div className="form-group">
                <label htmlFor="helperPostTitle">Название *</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <input
                    type="text"
                    id="helperPostTitle"
                    name="title"
                    placeholder="Введите название поста"
                    value={helperPostData.title}
                    onChange={handleHelperPostInputChange}
                    required
                  />
                </div>
              </div>

              {/* Описание */}
              <div className="form-group">
                <label htmlFor="helperPostDescription">Описание * (до 10000 символов)</label>
                <div className="input-wrapper">
                  <textarea
                    id="helperPostDescription"
                    name="description"
                    placeholder="Опишите ваш пост"
                    value={helperPostData.description}
                    onChange={handleHelperPostInputChange}
                    required
                    maxLength={10000}
                    rows="8"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ textAlign: 'right', marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                    {helperPostData.description.length} / 10000
                  </div>
                </div>
              </div>

              {/* Вложения (до 3) */}
              <div className="form-group">
                <label htmlFor="helperPostMedia">Вложения (до 3 файлов)</label>
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="file"
                    id="helperPostMedia"
                    multiple
                    accept="image/webp,image/jpeg,image/jpg"
                    onChange={handleHelperPostMediaChange}
                    style={{ display: 'none' }}
                  />
                  <div
                    onClick={() => {
                      if (helperPostMediaPreview.length < 3) {
                        document.getElementById('helperPostMedia').click();
                      }
                    }}
                    style={{
                      padding: '20px',
                      background: helperPostMediaPreview.length >= 3 ? 'rgba(30, 41, 59, 0.3)' : 'rgba(59, 130, 246, 0.05)',
                      border: `2px dashed ${helperPostMediaPreview.length >= 3 ? '#334155' : '#3b82f6'}`,
                      borderRadius: '12px',
                      cursor: helperPostMediaPreview.length >= 3 ? 'not-allowed' : 'pointer',
                      width: '100%',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      opacity: helperPostMediaPreview.length >= 3 ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (helperPostMediaPreview.length < 3) {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                        e.currentTarget.style.borderColor = '#2563eb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (helperPostMediaPreview.length < 3) {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                        e.currentTarget.style.borderColor = '#3b82f6';
                      }
                    }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: '32px', height: '32px', stroke: helperPostMediaPreview.length >= 3 ? '#64748b' : '#3b82f6', margin: '0 auto 12px', strokeWidth: '2', fill: 'none' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <div style={{ color: helperPostMediaPreview.length >= 3 ? '#64748b' : '#3b82f6', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                      + Загрузить вложения ({helperPostMediaPreview.length}/3)
                    </div>
                    <div style={{ color: '#64748b', fontSize: '12px', lineHeight: '1.6' }}>
                      <div style={{ marginBottom: '4px' }}>
                        <strong style={{ color: '#94a3b8' }}>Максимальный размер файла:</strong> 200 КБ
                      </div>
                      <div>
                        <strong style={{ color: '#94a3b8' }}>Формат:</strong> <span style={{ color: '#10b981' }}>WebP</span>, <span style={{ color: '#fbbf24' }}>JPEG</span>
                      </div>
                    </div>
                  </div>
                  {helperPostMediaPreview.length > 0 && (
                    <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                      {helperPostMediaPreview.map((preview, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                          <img
                            src={preview}
                            alt={`Вложение ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '150px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid #334155'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeHelperPostMedia(index)}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(239, 68, 68, 0.9)',
                              border: 'none',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Сумма сбора */}
              <div className="form-group">
                <label htmlFor="helperPostAmount">Сумма сбора *</label>
                <div style={{ marginBottom: '8px', fontSize: '12px', color: '#f59e0b' }}>
                  ⚠️ Внимание: сумму сбора нельзя будет изменить после создания поста
                </div>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="helperPostAmount"
                    name="amount"
                    placeholder="Введите сумму сбора"
                    value={helperPostData.amount}
                    onChange={handleHelperPostInputChange}
                    required
                    disabled={createdPost !== null} // Блокируем изменение если пост уже создан
                    style={{
                      opacity: createdPost !== null ? 0.6 : 1,
                      cursor: createdPost !== null ? 'not-allowed' : 'text',
                      paddingLeft: '16px'
                    }}
                  />
                </div>
                {createdPost !== null && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#f59e0b' }}>
                    Сумма сбора не может быть изменена
                  </div>
                )}
              </div>

              {helperPostError && (
                <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '14px' }}>
                  {helperPostError}
                </div>
              )}

              <button type="submit" className="submit-button" disabled={helperPostLoading}>
                {helperPostLoading ? (createdPost ? 'Сохранение...' : 'Создание...') : (createdPost ? 'Сохранить' : 'Создать пост')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно обработки поста (для "Мне нужна помощь") */}
      {mode === 'processing' && (
        <div className="processing-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '24px',
            padding: '48px',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 24px',
              border: '4px solid #3b82f6',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Обрабатывается</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Ваш пост обрабатывается...
            </p>
            <button
              onClick={() => {
                const postData = {
                  id: Date.now(),
                  ...helperPostData,
                  createdAt: new Date().toISOString(),
                  status: 'active'
                };
                setCreatedPost(postData);
                localStorage.setItem('helperPostCreated', 'true');
                localStorage.setItem('createdPostData', JSON.stringify(postData));
                setMode('viewPost');
              }}
              className="submit-button"
              style={{ marginTop: '24px' }}
            >
              ОК
            </button>
          </div>
        </div>
      )}

      {/* Просмотр и редактирование созданного поста (для "Мне нужна помощь") */}
      {mode === 'viewPost' && createdPost && (
        <div id="viewPost">
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: '24px', fontWeight: '700', margin: 0 }}>Ваш пост</h2>
            <button
              onClick={() => {
                // Переключаемся в режим редактирования
                setMode('createPost');
              }}
              style={{
                padding: '8px 16px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                color: '#3b82f6',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Редактировать
            </button>
          </div>
          
          <div className="posts-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            <div 
              className="post-card"
              style={{ '--progress-width': '0%' }}
              onClick={() => onOpenPost({
                id: createdPost.id,
                title: createdPost.title,
                description: createdPost.description,
                amount: parseFloat(createdPost.amount),
                collected: 0,
                authorName: `${createdPost.firstName} ${createdPost.lastName}`,
                avatar: createdPost.avatar || helperPostAvatarPreview,
                images: createdPost.images || helperPostMediaPreview,
                image: (createdPost.images && createdPost.images[0]) || (helperPostMediaPreview && helperPostMediaPreview[0])
              })}
            >
              {((createdPost.images && createdPost.images.length > 0) || (helperPostMediaPreview && helperPostMediaPreview.length > 0)) ? (
                <img 
                  src={(createdPost.images && createdPost.images[0]) || (helperPostMediaPreview && helperPostMediaPreview[0])} 
                  alt={createdPost.title || 'Пост'} 
                  className="post-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="post-image" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}></div>
              )}
              <div className="post-content">
                <div className="post-author">
                  {(createdPost.avatar || helperPostAvatarPreview) ? (
                    <img 
                      src={createdPost.avatar || helperPostAvatarPreview} 
                      alt={`${createdPost.firstName} ${createdPost.lastName}`} 
                      className="post-avatar"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="post-avatar" style={{ 
                      background: 'rgba(59, 130, 246, 0.2)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <svg style={{ width: '20px', height: '20px', stroke: '#3b82f6' }} viewBox="0 0 24 24">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                  )}
                  <div className="post-author-info">
                    <div className="post-author-name">
                      {createdPost.firstName} {createdPost.lastName}
                    </div>
                  </div>
                </div>
                <h3 className="post-title">{createdPost.title || 'Без названия'}</h3>
                <div className="amount-display" style={{ '--progress-width': '0%' }}>
                  <div className="amount-display-content">
                    <span className="amount-display-collected">0</span>
                    <span className="amount-display-target">{parseFloat(createdPost.amount).toLocaleString('ru-RU')}</span>
                  </div>
                </div>
              </div>
              <div className="post-id">ID: {generatePostId(createdPost.id)}</div>
            </div>
          </div>
        </div>
      )}


      {mode === 'posts' && (
        <div id="postsList">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
            <button id="paymentDetailsBtn" className="payment-details-button" onClick={handlePaymentDetails}>
              <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', stroke: 'currentColor', strokeWidth: '2', fill: 'none' }}>
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              Реквизиты для помощи
            </button>
          </div>
          
          {loading && postsToShow.length === 0 ? (
            <div className="empty-content">
              <p>Загрузка постов...</p>
            </div>
          ) : postsToShow.length === 0 ? (
            <div className="empty-content">
              <svg className="empty-icon" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <h3 className="empty-title">Пока нет доступных постов</h3>
              <p className="empty-description">Посты появятся здесь после загрузки с сервера</p>
            </div>
          ) : (
            <div className="posts-grid">
              {postsToShow.map((post) => {
                const collected = post.collected || 0;
                const amount = post.amount || 0;
                const progress = amount > 0 ? (collected / amount * 100) : 0;
                const uniqueId = generatePostId(post.id);
                
                // Используем уже преобразованные данные из контекста
                const postImages = post.images && Array.isArray(post.images) ? post.images : [];
                const authorAvatar = post.author?.avatar || post.avatar || null;
                const authorName = post.author?.name || post.user?.name || 'Аноним';
                
                // Логируем для первого поста
                if (postsToShow.indexOf(post) === 0) {
                  console.log('Отображение поста в Charity:', {
                    postId: post.id,
                    postTitle: post.title,
                    postImages: postImages,
                    postImagesLength: postImages.length,
                    firstImageUrl: postImages.length > 0 ? postImages[0] : null,
                    allPostData: post
                  });
                }
                
                return (
                  <div 
                    key={post.id || Math.random()} 
                    className="post-card"
                    onClick={() => onOpenPost(post)}
                    style={{ '--progress-width': `${progress}%` }}
                  >
                    {postImages.length > 0 ? (
                      <img 
                        src={postImages[0]} 
                        alt={post.title || 'Пост'} 
                        className="post-image"
                        onLoad={() => {
                          if (postsToShow.indexOf(post) === 0) {
                            console.log('Изображение успешно загружено:', postImages[0]);
                          }
                        }}
                        onError={(e) => {
                          console.error('Ошибка загрузки изображения поста:', {
                            url: postImages[0],
                            postId: post.id,
                            postTitle: post.title,
                            allImages: postImages
                          });
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="post-image" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}></div>
                    )}
                    <div className="post-content">
                      <div className="post-author">
                        {authorAvatar ? (
                          <img 
                            src={authorAvatar} 
                            alt={authorName} 
                            className="post-avatar"
                            onError={(e) => {
                              console.error('Ошибка загрузки аватара:', authorAvatar);
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="post-avatar" style={{ 
                            background: 'rgba(59, 130, 246, 0.2)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            <svg style={{ width: '20px', height: '20px', stroke: '#3b82f6' }} viewBox="0 0 24 24">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                          </div>
                        )}
                        <div className="post-author-info">
                          <div className="post-author-name">
                            {authorName}
                          </div>
                        </div>
                      </div>
                      <h3 className="post-title">{post.title || 'Без названия'}</h3>
                      <div className="amount-display" style={{ '--progress-width': `${progress}%` }}>
                        <div className="amount-display-content">
                          <span className="amount-display-collected">{(post.collected || 0).toLocaleString('ru-RU')}</span>
                          <span className="amount-display-target">{amount.toLocaleString('ru-RU')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="post-id">ID: {uniqueId}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showPaymentModal && (
        <div className="payment-modal active" onClick={(e) => {
          if (e.target.classList.contains('payment-modal')) {
            closePaymentModal();
          }
        }}>
          <div className="payment-modal-content">
            <button className="payment-modal-close" onClick={closePaymentModal}>
              <svg viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <h2 style={{ color: '#f1f5f9', fontSize: '24px', fontWeight: '700', marginBottom: '24px', textAlign: 'center' }}>Реквизиты для помощи</h2>
            
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Инструкция по переводу</h3>
              <div style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.8' }}>
                <p style={{ marginBottom: '12px' }}>Для того чтобы помочь нуждающемуся, выполните следующие шаги:</p>
                <ol style={{ marginLeft: '20px', marginBottom: '12px' }}>
                  <li style={{ marginBottom: '8px' }}>Откройте приложение вашего банка или перейдите на сайт банка</li>
                  <li style={{ marginBottom: '8px' }}>Выберите операцию "Перевод" или "Платеж"</li>
                  <li style={{ marginBottom: '8px' }}>Введите лицевой счет получателя (указан ниже)</li>
                  <li style={{ marginBottom: '8px' }}>Укажите сумму перевода</li>
                  <li style={{ marginBottom: '8px' }}><strong style={{ color: '#3b82f6' }}>Обязательно укажите в комментарии к переводу ID поста</strong> (ID указан справа вверху на карточке поста)</li>
                  <li style={{ marginBottom: '8px' }}>Проверьте данные и подтвердите перевод</li>
                </ol>
                <p style={{ color: '#fbbf24', fontWeight: '600', marginTop: '16px' }}>⚠️ Важно: Без указания ID поста в комментарии мы не сможем определить, кому именно предназначена помощь!</p>
              </div>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Реквизиты получателя</h3>
              <div style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.8' }}>
                <p style={{ marginBottom: '12px' }}><strong style={{ color: '#f1f5f9' }}>Получатель:</strong> ООО "Max"</p>
                <p style={{ marginBottom: '12px' }}><strong style={{ color: '#f1f5f9' }}>ИНН:</strong> 7707083893</p>
                <p style={{ marginBottom: '12px' }}><strong style={{ color: '#f1f5f9' }}>КПП:</strong> 770701001</p>
                <p style={{ marginBottom: '12px' }}><strong style={{ color: '#f1f5f9' }}>Банк:</strong> ПАО "Сбербанк"</p>
                <p style={{ marginBottom: '12px' }}><strong style={{ color: '#f1f5f9' }}>БИК:</strong> 044525225</p>
                <p style={{ marginBottom: '12px' }}><strong style={{ color: '#f1f5f9' }}>Корр. счет:</strong> 30101810400000000225</p>
                <p style={{ marginBottom: '0' }}><strong style={{ color: '#3b82f6', fontSize: '16px' }}>Лицевой счет:</strong> <span id="accountNumber" style={{ color: '#3b82f6', fontSize: '18px', fontWeight: '700', fontFamily: "'Courier New', monospace", letterSpacing: '1px' }}>40817810099910004312</span></p>
              </div>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155', borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '24px' }}>
              <h3 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>QR-код для быстрого перевода</h3>
              <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Отсканируйте QR-код в приложении вашего банка для быстрого перевода</p>
              <div id="qrCodeContainer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'white', padding: '20px', borderRadius: '12px', margin: '0 auto', width: 'fit-content' }}>
                <img src="http://qrcoder.ru/code/?%CF%EE%EB%F3%F7%E0%F2%E5%EB%FC%3A+%CE%CE%CE+%22%CC%E0%EA%F1%22%0D%0A%0D%0A%C8%CD%CD%3A+7707083893%0D%0A%0D%0A%CA%CF%CF%3A+770701001%0D%0A%0D%0A%C1%E0%ED%EA%3A+%CF%C0%CE+%22%D1%E1%E5%F0%E1%E0%ED%EA%22%0D%0A%0D%0A%C1%C8%CA%3A+044525225%0D%0A%0D%0A%CA%EE%F0%F0.+%F1%F7%E5%F2%3A+30101810400000000225%0D%0A%0D%0A%CB%E8%F6%E5%E2%EE%E9+%F1%F7%E5%F2%3A+40817810099910004312&4&0" width="276" height="276" border="0" alt="QR код для перевода" style={{ display: 'block' }} />
              </div>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Загрузка чека о переводе</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
                После совершения перевода, пожалуйста, загрузите чек или скриншот операции для подтверждения платежа. 
                Это поможет нам быстрее обработать ваше пожертвование и направить средства нуждающемуся.
              </p>
              <div style={{ background: 'rgba(15, 22, 41, 0.5)', border: '1px solid #334155', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '8px' }}><strong style={{ color: '#f1f5f9' }}>Доступные форматы:</strong> JPG, PNG, PDF</p>
                <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '0' }}><strong style={{ color: '#f1f5f9' }}>Максимальный размер файла:</strong> 10 МБ</p>
              </div>
              <div 
                ref={receiptUploadAreaRef}
                style={{ border: '2px dashed #334155', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '16px' }} 
                id="receiptUploadArea"
                onClick={handleReceiptUploadClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input 
                  ref={receiptFileInputRef}
                  type="file" 
                  id="receiptFileInput" 
                  accept="image/jpeg,image/png,image/jpg,application/pdf" 
                  style={{ display: 'none' }}
                  onChange={handleReceiptFileChange}
                />
                <svg style={{ width: '48px', height: '48px', stroke: '#64748b', margin: '0 auto 12px' }} viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Нажмите для загрузки чека</p>
                <p style={{ color: '#64748b', fontSize: '12px' }}>или перетащите файл сюда</p>
                {receiptFileName && (
                  <p id="receiptFileName" style={{ color: '#3b82f6', fontSize: '13px', marginTop: '8px' }}>{receiptFileName}</p>
                )}
              </div>
              {receiptFile && (
                <button 
                  id="submitReceiptBtn" 
                  className="submit-receipt-button" 
                  style={{ width: '100%', height: '48px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s' }}
                  onClick={handleReceiptSubmit}
                >
                  Отправить чек
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showReceiptProcessing && (
        <div className="receipt-processing-modal active">
          <div className="receipt-processing-content">
            <div style={{ width: '80px', height: '80px', border: '4px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 24px', animation: 'spin 1s linear infinite' }}></div>
            <h2 style={{ color: '#f1f5f9', fontSize: '24px', fontWeight: '700', marginBottom: '12px', textAlign: 'center' }}>Обработка чека</h2>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px', textAlign: 'center' }}>
              Мы обрабатываем ваш чек о переводе. Это может занять некоторое время. 
              Вы получите уведомление, когда обработка будет завершена.
            </p>
            <p style={{ color: '#3b82f6', fontSize: '13px', fontWeight: '600', textAlign: 'center', marginBottom: '24px' }}>Обычно обработка занимает 2-5 минут</p>
            <button 
              onClick={() => setShowReceiptProcessing(false)}
              style={{ width: '100%', height: '48px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s' }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Charity;

