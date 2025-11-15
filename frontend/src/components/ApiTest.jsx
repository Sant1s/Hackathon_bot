import React, { useState } from 'react';
import { apiClient } from '../api/client';

/**
 * Компонент для проверки подключения к API
 * Используйте его для тестирования, затем удалите или закомментируйте
 */
const ApiTest = () => {
  const [status, setStatus] = useState('Не проверено');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setStatus('Проверяю подключение...');
    
    try {
      // Пробуем health check endpoint
      let result;
      try {
        result = await apiClient.healthGet();
      } catch (healthErr) {
        // Если health не работает, пробуем получить посты (публичный endpoint)
        console.log('Health endpoint недоступен, пробую postsGet...');
        result = await apiClient.postsGet();
        setStatus('✅ Подключение успешно! (через posts endpoint)');
        setResponse({ message: 'Health endpoint недоступен, но posts endpoint работает', data: result.data });
        console.log('Ответ от сервера (posts):', result.data);
        setLoading(false);
        return;
      }
      
      setResponse(result.data);
      setStatus('✅ Подключение успешно!');
      console.log('Ответ от сервера:', result.data);
    } catch (err) {
      let errorMessage = 'Ошибка подключения';
      
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        errorMessage = 'Network Error: Не удалось подключиться к серверу. Возможные причины:\n' +
          '1. Сервер недоступен (http://82.202.142.141:8080)\n' +
          '2. Проблема CORS - сервер не разрешает запросы с localhost:3000\n' +
          '3. Блокировка файрволом или антивирусом';
      } else if (err.response) {
        errorMessage = `Ошибка ${err.response.status}: ${err.response.statusText || err.message}`;
        if (err.response.status === 401) {
          errorMessage += ' (Требуется авторизация)';
        } else if (err.response.status === 404) {
          errorMessage = `404 Not Found: Endpoint не найден.\n` +
            `Проверьте:\n` +
            `1. Правильность пути: http://82.202.142.141:8080/api/v1/health\n` +
            `2. Возможно, endpoint не реализован на сервере\n` +
            `3. Попробуйте другой endpoint (например, /posts)`;
        } else if (err.response.status === 0) {
          errorMessage = 'CORS Error: Сервер блокирует запрос. Нужно настроить CORS на бэкенде.';
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setStatus('❌ Ошибка подключения');
      console.error('Ошибка:', err);
      console.error('Детали:', {
        message: err.message,
        code: err.code,
        response: err.response,
        request: err.request
      });
      
      // Дополнительная информация об ошибке
      if (err.response) {
        console.error('Статус:', err.response.status);
        console.error('Данные:', err.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', borderRadius: '8px' }}>
      <h3>Тест подключения к API</h3>
      <p><strong>Сервер:</strong> http://82.202.142.141:8080</p>
      <p><strong>Статус:</strong> {status}</p>
      
      <button 
        onClick={testConnection} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Проверяю...' : 'Проверить подключение'}
      </button>

      {error && (
        <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#fee', borderRadius: '4px', border: '1px solid #f5c6cb' }}>
          <strong style={{ color: '#721c24' }}>Ошибка:</strong>
          <pre style={{ 
            marginTop: '10px', 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            fontSize: '13px',
            color: '#721c24'
          }}>{error}</pre>
          <div style={{ marginTop: '15px', fontSize: '13px', color: '#666' }}>
            <p><strong>Что проверить:</strong></p>
            <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
              <li>Проверьте доступность сервера: <a href="http://82.202.142.141:8080" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>http://82.202.142.141:8080</a></li>
              <li>Попробуйте другие endpoints: <a href="http://82.202.142.141:8080/api/v1/posts" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>/api/v1/posts</a></li>
              <li>Проверьте консоль браузера (F12) для деталей</li>
              <li>Если видите CORS ошибку - нужно настроить CORS на бэкенде</li>
            </ul>
          </div>
        </div>
      )}

      {response && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#efe', borderRadius: '4px' }}>
          <strong>Ответ сервера:</strong>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default ApiTest;

