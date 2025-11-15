# Go HTTP Server Template with PostgreSQL and MinIO

Шаблон для создания HTTP сервера на Go с использованием PostgreSQL для хранения метаданных и MinIO для хранения файлов.

## Возможности

- HTTP сервер с использованием Gorilla Mux
- Подключение к PostgreSQL
- Интеграция с MinIO для хранения файлов
- API для загрузки, получения и удаления файлов
- Health check endpoint
- Graceful shutdown
- Конфигурация через переменные окружения

## Требования

- Go 1.21 или выше
- PostgreSQL
- MinIO

## Установка

1. Клонируйте репозиторий или используйте этот шаблон

2. Установите зависимости:
```bash
go mod download
```

3. Скопируйте `.env.example` в `.env` и настройте переменные окружения:
```bash
cp .env.example .env
```

4. Настройте переменные окружения в `.env`:
```env
PORT=8080
DATABASE_URL=postgres://user:password@localhost:5432/dbname?sslmode=disable
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY_ID=minioadmin
MINIO_SECRET_ACCESS_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=files
```

5. Создайте базу данных PostgreSQL и выполните миграцию (опционально):
```bash
# Подключитесь к PostgreSQL и создайте базу данных
createdb dbname

# Или используйте SQL:
# CREATE DATABASE dbname;
```

6. Запустите MinIO (например, через Docker):
```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

7. Запустите сервер:
```bash
go run .
```

## API Endpoints

### Health Check
```
GET /health
```
Проверяет состояние сервера, подключение к базе данных и MinIO.

### Загрузка файла
```
POST /api/files
Content-Type: multipart/form-data

Form field: file
```
Загружает файл в MinIO и сохраняет метаданные в PostgreSQL.

### Получение файла
```
GET /api/files/{id}
```
Скачивает файл по ID.

### Удаление файла
```
DELETE /api/files/{id}
```
Удаляет файл из MinIO и базы данных.

## Структура проекта

```
.
├── main.go          # Точка входа приложения
├── config.go        # Конфигурация и переменные окружения
├── database.go      # Подключение к PostgreSQL
├── minio.go         # Подключение к MinIO
├── models.go        # Модели данных
├── handlers.go      # HTTP обработчики
├── go.mod           # Зависимости Go
├── .env.example     # Пример переменных окружения
└── README.md        # Документация
```

## Инициализация схемы базы данных

При первом запуске рекомендуется вызвать метод `InitSchema()` для создания таблиц:

```go
// В main.go после подключения к БД
if err := db.InitSchema(); err != nil {
    log.Fatalf("Failed to initialize schema: %v", err)
}
```

## Разработка

Для разработки рекомендуется использовать:

- [Air](https://github.com/cosmtrek/air) для hot reload
- [Postman](https://www.postman.com/) или [curl](https://curl.se/) для тестирования API

## Лицензия

MIT

