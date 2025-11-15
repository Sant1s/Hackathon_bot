import { DefaultApi } from './api.ts';
import apiConfig, { updateToken } from './config.js';

// Создаем экземпляр API клиента с настроенной конфигурацией
let apiClient = new DefaultApi(apiConfig);

// Функция для пересоздания клиента с обновленным токеном
export const refreshApiClient = () => {
  // Обновляем токен в конфигурации
  const token = localStorage.getItem('token');
  if (token) {
    apiConfig.accessToken = token;
  } else {
    apiConfig.accessToken = undefined;
  }
  // Пересоздаем клиент
  apiClient = new DefaultApi(apiConfig);
  return apiClient;
};

// Экспортируем клиент, конфигурацию и функцию обновления
export { apiClient, apiConfig, updateToken };

