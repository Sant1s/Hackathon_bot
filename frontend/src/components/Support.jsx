import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getStorageItem, setStorageItem, removeStorageItem, getSavedPhone } from '../utils/storage';

const Support = () => {
  const { userProfile } = useApp();
  
  // Получаем номер телефона для привязки данных
  const getPhone = () => {
    return getSavedPhone() || null;
  };
  
  // Определяем доступные категории в зависимости от действий в Благотворительности
  const getAvailableCategories = useCallback(() => {
    const phone = getPhone();
    const charityMode = getStorageItem('charityMode', phone);
    const helperName = getStorageItem('helperName', phone);
    
    // По умолчанию доступны только "Проблемы с авторизацией" и "Иное"
    const categories = {
      auth: true,      // Всегда доступна
      sendMoney: false, // Появляется при "Я хочу помочь"
      receiveMoney: false, // Появляется при "Мне нужна помощь"
      other: true      // Всегда доступна
    };
    
    // Если пользователь нажал "Я хочу помочь" (режим intro или posts)
    if (charityMode === 'intro' || charityMode === 'posts' || helperName) {
      categories.sendMoney = true;
    }
    
    // Если пользователь нажал "Мне нужна помощь" (режим passport, verifying, createPost, viewPost, processing)
    if (['passport', 'verifying', 'createPost', 'viewPost', 'processing'].includes(charityMode)) {
      categories.receiveMoney = true;
    }
    
    return categories;
  }, []); // Функция стабильна, так как использует только утилиты
  
  const [availableCategories, setAvailableCategories] = useState(getAvailableCategories());
  
  // Обновляем доступные категории при изменении данных в localStorage или при монтировании
  useEffect(() => {
    const updateCategories = () => {
      const newCategories = getAvailableCategories();
      setAvailableCategories(prev => {
        // Обновляем только если что-то изменилось
        if (JSON.stringify(prev) !== JSON.stringify(newCategories)) {
          return newCategories;
        }
        return prev;
      });
    };
    
    // Обновляем при монтировании
    updateCategories();
    
    // Обновляем при изменении данных в localStorage
    const handleStorageChange = () => {
      updateCategories();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('currentPhoneChanged', handleStorageChange);
    
    // Также проверяем периодически (на случай, если данные изменились в том же окне)
    // Увеличиваем интервал до 1 секунды, чтобы не нагружать систему
    const interval = setInterval(updateCategories, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('currentPhoneChanged', handleStorageChange);
      clearInterval(interval);
    };
  }, [getAvailableCategories]);
  
  // Восстанавливаем состояние из localStorage при инициализации
  const getInitialState = () => {
    const phone = getPhone();
    if (!phone) {
      // Если номера еще нет, возвращаем начальное состояние
      return {
        showChat: false,
        messages: [],
        selectedCategory: null,
        showChatItem: false,
        hasReceivedStandardResponse: false
      };
    }
    
    const savedShowChat = getStorageItem('supportShowChat', phone);
    const savedMessages = getStorageItem('supportMessages', phone);
    const savedSelectedCategory = getStorageItem('supportSelectedCategory', phone);
    const savedShowChatItem = getStorageItem('supportShowChatItem', phone);
    const savedHasReceivedStandardResponse = getStorageItem('supportHasReceivedStandardResponse', phone);
    
    return {
      showChat: savedShowChat === true || savedShowChat === 'true',
      messages: savedMessages ? (Array.isArray(savedMessages) ? savedMessages : (typeof savedMessages === 'string' ? JSON.parse(savedMessages) : savedMessages)).map(msg => ({
        ...msg,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
      })) : [],
      selectedCategory: savedSelectedCategory || null,
      showChatItem: savedShowChatItem === true || savedShowChatItem === 'true',
      hasReceivedStandardResponse: savedHasReceivedStandardResponse === true || savedHasReceivedStandardResponse === 'true'
    };
  };
  
  const initialState = getInitialState();
  const [showChat, setShowChat] = useState(initialState.showChat);
  const [messages, setMessages] = useState(initialState.messages);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialState.selectedCategory);
  const [showChatItem, setShowChatItem] = useState(initialState.showChatItem);
  const [hasReceivedStandardResponse, setHasReceivedStandardResponse] = useState(initialState.hasReceivedStandardResponse);
  
  // Восстанавливаем данные при появлении номера телефона
  useEffect(() => {
    const phone = getPhone();
    if (!phone) {
      // Если номера еще нет, ждем его появления
      const checkPhone = setInterval(() => {
        const currentPhone = getPhone();
        if (currentPhone) {
          clearInterval(checkPhone);
          // Восстанавливаем данные после получения номера
          const savedShowChat = getStorageItem('supportShowChat', currentPhone);
          const savedMessages = getStorageItem('supportMessages', currentPhone);
          const savedSelectedCategory = getStorageItem('supportSelectedCategory', currentPhone);
          const savedShowChatItem = getStorageItem('supportShowChatItem', currentPhone);
          const savedHasReceivedStandardResponse = getStorageItem('supportHasReceivedStandardResponse', currentPhone);
          
          if (savedShowChat !== null && savedShowChat !== undefined) {
            setShowChat(savedShowChat === true || savedShowChat === 'true');
          }
          if (savedMessages && savedMessages.length > 0) {
            setMessages(savedMessages.map(msg => ({
              ...msg,
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
            })));
          }
          if (savedSelectedCategory) {
            setSelectedCategory(savedSelectedCategory);
          }
          if (savedShowChatItem !== null && savedShowChatItem !== undefined) {
            setShowChatItem(savedShowChatItem === true || savedShowChatItem === 'true');
          }
          if (savedHasReceivedStandardResponse !== null && savedHasReceivedStandardResponse !== undefined) {
            setHasReceivedStandardResponse(savedHasReceivedStandardResponse === true || savedHasReceivedStandardResponse === 'true');
          }
          console.log('Восстановлены данные поддержки для телефона:', currentPhone);
        }
      }, 100);
      return () => clearInterval(checkPhone);
    }
  }, []);
  
  // Сохраняем состояние в localStorage при изменении
  useEffect(() => {
    const phone = getPhone();
    if (phone) {
      setStorageItem('supportShowChat', showChat, phone);
      setStorageItem('supportShowChatItem', showChatItem, phone);
      setStorageItem('supportSelectedCategory', selectedCategory || '', phone);
      setStorageItem('supportHasReceivedStandardResponse', hasReceivedStandardResponse, phone);
    }
  }, [showChat, showChatItem, selectedCategory, hasReceivedStandardResponse]);
  
  // Сохраняем сообщения в localStorage при изменении
  useEffect(() => {
    const phone = getPhone();
    if (phone) {
      if (messages.length > 0) {
        setStorageItem('supportMessages', messages, phone);
      } else {
        removeStorageItem('supportMessages', phone);
      }
    }
  }, [messages]);
  
  // Получаем данные пользователя из профиля
  const getUserName = () => {
    if (userProfile && userProfile.name) {
      return userProfile.name;
    }
    const savedProfile = JSON.parse(localStorage.getItem('userProfile') || 'null');
    if (savedProfile && savedProfile.firstName && savedProfile.lastName) {
      return `${savedProfile.firstName} ${savedProfile.lastName}`;
    }
    return 'Пользователь';
  };
  
  const getUserAvatar = () => {
    if (userProfile && userProfile.avatar) {
      return userProfile.avatar;
    }
    const savedProfile = JSON.parse(localStorage.getItem('userProfile') || 'null');
    if (savedProfile && savedProfile.photo) {
      return savedProfile.photo;
    }
    return null;
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId);
    setShowChat(true);
    setShowChatItem(true);
    setHasReceivedStandardResponse(false);
    
    // Определяем автоматическое сообщение пользователя в зависимости от категории
    let userMessageText = '';
    if (categoryId === 'auth') {
      userMessageText = 'Здравствуйте! У меня проблема с авторизацией';
    } else if (categoryId === 'sendMoney') {
      userMessageText = 'Здравствуйте! У меня проблема с переводом средств';
    } else if (categoryId === 'receiveMoney') {
      userMessageText = 'Здравствуйте! У меня проблема с получением средств';
    }
    
    // Если это категория с автоматическим сообщением, отправляем его
    if (userMessageText && messages.length === 0) {
      const userMessage = {
        id: 1,
        text: userMessageText,
        isSupport: false,
        timestamp: new Date()
      };
      
      setMessages([userMessage]);
      
      // Через небольшую задержку отправляем ответ поддержки
      setTimeout(() => {
        const supportResponse = {
          id: 2,
          text: 'Здравствуйте! Опишите проблему',
          isSupport: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, supportResponse]);
      }, 500);
    } else if (messages.length === 0) {
      // Для категории "Иное" просто показываем приветствие
      setMessages([{
        id: 1,
        text: 'Здравствуйте! Чем могу помочь?',
        isSupport: true,
        timestamp: new Date()
      }]);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      text: inputMessage,
      isSupport: false,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    
    // Автоматически показываем чат после отправки первого сообщения
    if (!showChat) {
      setShowChat(true);
    }

    // Симуляция ответа поддержки (только если еще не было стандартного ответа)
    // Проверяем, было ли уже сообщение "Опишите проблему" - если да, то отправляем финальное сообщение
    if (!hasReceivedStandardResponse) {
      const hasDescribeMessage = updatedMessages.some(msg => 
        msg.isSupport && msg.text.includes('Опишите проблему')
      );
      
      if (hasDescribeMessage) {
        // Если было сообщение "Опишите проблему", отправляем финальное сообщение
        setTimeout(() => {
          const supportResponse = {
            id: updatedMessages.length + 1,
            text: 'Спасибо за обращение. Мы обработаем ваш запрос и свяжемся с вами в ближайшее время.',
            isSupport: true,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, supportResponse]);
          setHasReceivedStandardResponse(true);
        }, 1000);
      }
    }
  };

  const handleCloseChat = () => {
    setShowChat(false);
    // При закрытии чата не удаляем сообщения, чтобы можно было вернуться
  };

  return (
    <div className="content-section active" id="info">
      <div className="support-container">
        <div className="header" style={{ marginBottom: '32px' }}>
          <div className="icon-wrapper">
            <svg className="user-icon" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
          </div>
          <h1>Поддержка</h1>
          <p className="subtitle">Мы поможем решить вашу проблему</p>
        </div>

        {!showChat && messages.length === 0 && (
          <div className="support-categories" id="supportCategories">
            {availableCategories.auth && (
              <div className="support-category" onClick={() => handleCategoryClick('auth')}>
                <div className="support-category-icon">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <h3>Проблемы с авторизацией</h3>
                <p>Не могу войти в аккаунт, забыл пароль, проблемы с телефоном</p>
              </div>
            )}

            {availableCategories.sendMoney && (
              <div className="support-category" onClick={() => handleCategoryClick('sendMoney')}>
                <div className="support-category-icon">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <h3>Проблемы с переводом средств</h3>
                <p>Не могу отправить деньги, перевод не прошел, проблемы с реквизитами</p>
              </div>
            )}

            {availableCategories.receiveMoney && (
              <div className="support-category" onClick={() => handleCategoryClick('receiveMoney')}>
                <div className="support-category-icon">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                </div>
                <h3>Проблемы с получением средств</h3>
                <p>Не пришли деньги, проблемы с верификацией, пост не отображается</p>
              </div>
            )}

            {availableCategories.other && (
              <div className="support-category" onClick={() => handleCategoryClick('other')}>
                <div className="support-category-icon">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </div>
                <h3>Иное</h3>
                <p>Другие вопросы и проблемы</p>
              </div>
            )}
          </div>
        )}

        {showChatItem && !showChat && (
          <div className="support-chat-item" id="supportChatItem">
            <div className="support-chat-item-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </div>
            <div className="support-chat-item-info" onClick={() => setShowChat(true)}>
              <div className="support-chat-item-name">Поддержка</div>
              <div className="support-chat-item-last-message" id="supportChatLastMessage">
                {messages.length > 0 ? messages[messages.length - 1].text : 'Начните диалог'}
              </div>
            </div>
          </div>
        )}

        {showChat && (
          <div className="support-chat-container" id="supportChatContainer">
            <div className="support-chat-window">
              <div className="support-chat-header">
                <div className="support-chat-header-info">
                  <div className="support-chat-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                  </div>
                  <div>
                    <div className="support-chat-operator">Поддержка</div>
                    <div className="support-chat-status">онлайн</div>
                  </div>
                </div>
                <button className="support-close-btn" onClick={handleCloseChat}>
                  <svg viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="support-chat-messages" id="supportChatMessages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`support-chat-message ${msg.isSupport ? 'support-message' : 'user-message'}`}>
                    {msg.isSupport ? (
                      <>
                        <div className="support-chat-message-avatar operator">
                          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                          </svg>
                        </div>
                        <div className="support-chat-message-content-wrapper">
                          <div className="support-chat-message-author">Поддержка</div>
                          <div className="support-chat-message-content">
                            <div className="support-chat-message-text">{msg.text}</div>
                            <div className="support-chat-message-time">
                              {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="support-chat-message-content-wrapper">
                          <div className="support-chat-message-author" style={{ textAlign: 'right' }}>{getUserName()}</div>
                          <div className="support-chat-message-content">
                            <div className="support-chat-message-text">{msg.text}</div>
                            <div className="support-chat-message-time">
                              {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        <div className="support-chat-message-avatar user">
                          {getUserAvatar() ? (
                            <img 
                              src={getUserAvatar()} 
                              alt={getUserName()} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="support-chat-input-container">
                <form onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    className="support-chat-input"
                    id="supportChatInput"
                    placeholder="Напишите сообщение..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                  />
                  <button type="submit" className="support-chat-send-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Support;

