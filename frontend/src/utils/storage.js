// Утилита для работы с localStorage с привязкой к номеру телефона

// Получаем номер телефона текущего пользователя
export const getCurrentPhone = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  // Пытаемся получить номер из профиля
  const userProfile = JSON.parse(localStorage.getItem('userProfile') || 'null');
  if (userProfile && userProfile.phone) {
    return userProfile.phone;
  }
  
  // Если нет в профиле, пытаемся получить из контекста через API
  // Но для этого нужен доступ к API, поэтому пока возвращаем null
  // В компонентах будем передавать номер явно
  return null;
};

// Сохраняем номер телефона текущего пользователя
export const setCurrentPhone = (phone) => {
  if (phone) {
    localStorage.setItem('currentPhone', phone);
    // Триггерим событие для обновления компонентов
    window.dispatchEvent(new Event('currentPhoneChanged'));
    console.log('Сохранен номер телефона для привязки данных:', phone);
  }
};

// Получаем сохраненный номер телефона
export const getSavedPhone = () => {
  return localStorage.getItem('currentPhone');
};

// Создаем ключ с префиксом номера телефона
export const getStorageKey = (key, phone) => {
  if (!phone) {
    // Если номер не передан, пытаемся получить текущий
    phone = getSavedPhone() || getCurrentPhone();
  }
  
  if (!phone) {
    // Если номера нет, используем ключ без префикса (для обратной совместимости)
    console.warn(`Номер телефона не найден для ключа ${key}, используется ключ без префикса`);
    return key;
  }
  
  // Нормализуем номер телефона (убираем пробелы, скобки и т.д.)
  const normalizedPhone = phone.replace(/\D/g, '');
  return `${key}_${normalizedPhone}`;
};

// Сохраняем значение с привязкой к номеру телефона
export const setStorageItem = (key, value, phone = null) => {
  const storageKey = getStorageKey(key, phone);
  if (value === null || value === undefined) {
    localStorage.removeItem(storageKey);
  } else {
    localStorage.setItem(storageKey, typeof value === 'string' ? value : JSON.stringify(value));
  }
};

// Получаем значение с привязкой к номеру телефона
export const getStorageItem = (key, phone = null) => {
  const storageKey = getStorageKey(key, phone);
  const value = localStorage.getItem(storageKey);
  if (!value) return null;
  
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};

// Удаляем значение с привязкой к номеру телефона
export const removeStorageItem = (key, phone = null) => {
  const storageKey = getStorageKey(key, phone);
  localStorage.removeItem(storageKey);
};

// Очищаем все данные для конкретного номера телефона
export const clearUserDataForPhone = (phone) => {
  if (!phone) return;
  
  const normalizedPhone = phone.replace(/\D/g, '');
  const prefix = `_${normalizedPhone}`;
  
  // Список всех ключей, которые нужно очистить
  const keys = [
    'helperName',
    'charityMode',
    'passportData',
    'passportScansPreview',
    'createdPostData',
    'helperPostData',
    'helperPostMediaPreview',
    'helperPostAvatarPreview',
    'verificationStatus',
    'supportShowChat',
    'supportMessages',
    'supportSelectedCategory',
    'supportShowChatItem',
    'supportHasReceivedStandardResponse',
    'userProfile',
    'userProfileData',
    'helperPostCreated'
  ];
  
  keys.forEach(key => {
    localStorage.removeItem(`${key}${prefix}`);
  });
  
  console.log(`Очищены данные для номера телефона: ${phone}`);
};

