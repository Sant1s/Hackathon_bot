import React from 'react';
import { useApp } from '../context/AppContext';

const ChatList = () => {
  const { chats, loading } = useApp();

  if (loading && chats.length === 0) {
    return (
      <div className="content-section active">
        <h2>Чаты</h2>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!chats || chats.length === 0) {
    return (
      <div className="content-section active">
        <h2>Чаты</h2>
        <p>У вас пока нет чатов</p>
      </div>
    );
  }

  return (
    <div className="content-section active">
      <h2>Чаты</h2>
      <div style={{ marginTop: '20px' }}>
        {chats.map((chat) => (
          <div
            key={chat.id || Math.random()}
            style={{
              padding: '15px',
              margin: '10px 0',
              border: '1px solid #ccc',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>
                  {chat.interlocutor ? chat.interlocutor.name || 'Пользователь' : 'Чат'}
                </strong>
                {chat.last_message && (
                  <p style={{ marginTop: '5px', color: '#666', fontSize: '14px' }}>
                    {chat.last_message.text || 'Нет сообщений'}
                  </p>
                )}
              </div>
              {chat.unread_count > 0 && (
                <span style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  borderRadius: '50%',
                  padding: '5px 10px',
                  fontSize: '12px',
                }}>
                  {chat.unread_count}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatList;

