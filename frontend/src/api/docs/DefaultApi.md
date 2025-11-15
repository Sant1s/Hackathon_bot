# DefaultApi

All URIs are relative to *http://localhost:8080/api/v1*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**authLoginPost**](#authloginpost) | **POST** /auth/login | Вход в систему|
|[**authRefreshPost**](#authrefreshpost) | **POST** /auth/refresh | Обновление токена|
|[**authRegisterPost**](#authregisterpost) | **POST** /auth/register | Регистрация пользователя|
|[**chatsGet**](#chatsget) | **GET** /chats | Получить список чатов|
|[**chatsIdMessagesGet**](#chatsidmessagesget) | **GET** /chats/{id}/messages | Получить сообщения чата|
|[**chatsIdMessagesMessageIdDelete**](#chatsidmessagesmessageiddelete) | **DELETE** /chats/{id}/messages/{message_id} | Удалить сообщение|
|[**chatsIdMessagesMessageIdPatch**](#chatsidmessagesmessageidpatch) | **PATCH** /chats/{id}/messages/{message_id} | Редактировать сообщение|
|[**chatsIdMessagesPost**](#chatsidmessagespost) | **POST** /chats/{id}/messages | Отправить сообщение|
|[**chatsIdMessagesReadPatch**](#chatsidmessagesreadpatch) | **PATCH** /chats/{id}/messages/read | Отметить сообщения как прочитанные|
|[**chatsPost**](#chatspost) | **POST** /chats | Создать чат|
|[**donationsGet**](#donationsget) | **GET** /donations | Получить список пожертвований|
|[**donationsIdGet**](#donationsidget) | **GET** /donations/{id} | Получить пожертвование|
|[**donationsIdPatch**](#donationsidpatch) | **PATCH** /donations/{id} | Подтвердить/отклонить пожертвование|
|[**donationsPost**](#donationspost) | **POST** /donations | Создать пожертвование|
|[**filesBucketObjectKeyGet**](#filesbucketobjectkeyget) | **GET** /files/{bucket}/{objectKey} | Получить файл|
|[**filesPresignedUrlPost**](#filespresignedurlpost) | **POST** /files/presigned-url | Получить presigned URL для чтения|
|[**healthGet**](#healthget) | **GET** /health | Health check|
|[**postsGet**](#postsget) | **GET** /posts | Получить список постов|
|[**postsIdDelete**](#postsiddelete) | **DELETE** /posts/{id} | Удалить пост|
|[**postsIdGet**](#postsidget) | **GET** /posts/{id} | Получить пост|
|[**postsIdMediaMediaIdDelete**](#postsidmediamediaiddelete) | **DELETE** /posts/{id}/media/{media_id} | Удалить медиа из поста|
|[**postsIdMediaPost**](#postsidmediapost) | **POST** /posts/{id}/media | Добавить медиа к посту|
|[**postsIdPatch**](#postsidpatch) | **PATCH** /posts/{id} | Обновить пост|
|[**postsPost**](#postspost) | **POST** /posts | Создать пост|
|[**ratingsGet**](#ratingsget) | **GET** /ratings | Получить рейтинг пользователей|
|[**ratingsMeGet**](#ratingsmeget) | **GET** /ratings/me | Получить свой рейтинг|
|[**uploadPresignedUrlPost**](#uploadpresignedurlpost) | **POST** /upload/presigned-url | Получить presigned URL|
|[**usersMeChangePasswordPost**](#usersmechangepasswordpost) | **POST** /users/me/change-password | Изменить пароль|
|[**usersMeGet**](#usersmeget) | **GET** /users/me | Получить профиль|
|[**usersMePatch**](#usersmepatch) | **PATCH** /users/me | Обновить профиль|
|[**usersMePhotoPost**](#usersmephotopost) | **POST** /users/me/photo | Загрузить фото профиля|
|[**verificationsGet**](#verificationsget) | **GET** /verifications | Получить список заявок на верификацию|
|[**verificationsIdPatch**](#verificationsidpatch) | **PATCH** /verifications/{id} | Одобрить/отклонить верификацию|
|[**verificationsMeGet**](#verificationsmeget) | **GET** /verifications/me | Получить статус верификации|
|[**verificationsPost**](#verificationspost) | **POST** /verifications | Подать заявку на верификацию|

# **authLoginPost**
> MainLoginResponse authLoginPost(request)

Аутентифицирует пользователя и возвращает JWT токен

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    MainLoginRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let request: MainLoginRequest; //Данные входа

const { status, data } = await apiInstance.authLoginPost(
    request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **request** | **MainLoginRequest**| Данные входа | |


### Return type

**MainLoginResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authRefreshPost**
> MainRefreshTokenResponse authRefreshPost()

Обновляет JWT токен пользователя

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.authRefreshPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**MainRefreshTokenResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authRegisterPost**
> MainRegisterResponse authRegisterPost(request)

Регистрирует нового пользователя в системе

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    MainRegisterRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let request: MainRegisterRequest; //Данные регистрации

const { status, data } = await apiInstance.authRegisterPost(
    request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **request** | **MainRegisterRequest**| Данные регистрации | |


### Return type

**MainRegisterResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |
|**400** | Bad Request |  -  |
|**409** | Conflict |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **chatsGet**
> MainChatsListResponse chatsGet()

Возвращает список всех чатов текущего пользователя

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.chatsGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**MainChatsListResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **chatsIdMessagesGet**
> MainMessagesListResponse chatsIdMessagesGet()

Возвращает список сообщений в чате с пагинацией

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: number; //ID чата (default to undefined)
let page: number; //Номер страницы (optional) (default to 1)
let limit: number; //Количество сообщений (optional) (default to 50)

const { status, data } = await apiInstance.chatsIdMessagesGet(
    id,
    page,
    limit
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | ID чата | defaults to undefined|
| **page** | [**number**] | Номер страницы | (optional) defaults to 1|
| **limit** | [**number**] | Количество сообщений | (optional) defaults to 50|


### Return type

**MainMessagesListResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **chatsIdMessagesMessageIdDelete**
> chatsIdMessagesMessageIdDelete()

Удаляет сообщение из чата (только отправитель может удалить)

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: number; //ID чата (default to undefined)
let messageId: number; //ID сообщения (default to undefined)

const { status, data } = await apiInstance.chatsIdMessagesMessageIdDelete(
    id,
    messageId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | ID чата | defaults to undefined|
| **messageId** | [**number**] | ID сообщения | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Успешно удалено |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **chatsIdMessagesMessageIdPatch**
> MainMessageUpdateResponse chatsIdMessagesMessageIdPatch(request)

Редактирует текст сообщения (только отправитель может редактировать)

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    MainUpdateMessageRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: number; //ID чата (default to undefined)
let messageId: number; //ID сообщения (default to undefined)
let request: MainUpdateMessageRequest; //Новый текст

const { status, data } = await apiInstance.chatsIdMessagesMessageIdPatch(
    id,
    messageId,
    request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **request** | **MainUpdateMessageRequest**| Новый текст | |
| **id** | [**number**] | ID чата | defaults to undefined|
| **messageId** | [**number**] | ID сообщения | defaults to undefined|


### Return type

**MainMessageUpdateResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **chatsIdMessagesPost**
> MainMessageResponse chatsIdMessagesPost()

Отправляет новое сообщение в чат (текст или вложение)

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: number; //ID чата (default to undefined)
let text: string; //Текст сообщения (optional) (default to undefined)
let attachment: File; //Вложение (изображение, до 5MB) (optional) (default to undefined)

const { status, data } = await apiInstance.chatsIdMessagesPost(
    id,
    text,
    attachment
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | ID чата | defaults to undefined|
| **text** | [**string**] | Текст сообщения | (optional) defaults to undefined|
| **attachment** | [**File**] | Вложение (изображение, до 5MB) | (optional) defaults to undefined|


### Return type

**MainMessageResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: multipart/form-data
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **chatsIdMessagesReadPatch**
> MainMarkMessagesReadResponse chatsIdMessagesReadPatch()

Отмечает сообщения в чате как прочитанные

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    MainMarkMessagesReadRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: number; //ID чата (default to undefined)
let request: MainMarkMessagesReadRequest; //ID сообщений (опционально, если пусто - все сообщения) (optional)

const { status, data } = await apiInstance.chatsIdMessagesReadPatch(
    id,
    request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **request** | **MainMarkMessagesReadRequest**| ID сообщений (опционально, если пусто - все сообщения) | |
| **id** | [**number**] | ID чата | defaults to undefined|


### Return type

**MainMarkMessagesReadResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **chatsPost**
> MainChatResponse chatsPost(request)

Создает новый чат между помощником и нуждающимся по посту

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    MainCreateChatRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let request: MainCreateChatRequest; //ID поста

const { status, data } = await apiInstance.chatsPost(
    request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **request** | **MainCreateChatRequest**| ID поста | |


### Return type

**MainChatResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**409** | Conflict |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **donationsGet**
> MainDonationsListResponse donationsGet()

Возвращает список пожертвований с фильтрацией и пагинацией

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let postId: number; //Фильтр по посту (optional) (default to undefined)
let donorId: number; //Фильтр по донору (optional) (default to undefined)
let status: 'pending' | 'confirmed' | 'rejected'; //Фильтр по статусу (optional) (default to undefined)
let page: number; //Номер страницы (optional) (default to 1)
let limit: number; //Количество на странице (optional) (default to 20)

const { status, data } = await apiInstance.donationsGet(
    postId,
    donorId,
    status,
    page,
    limit
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **postId** | [**number**] | Фильтр по посту | (optional) defaults to undefined|
| **donorId** | [**number**] | Фильтр по донору | (optional) defaults to undefined|
| **status** | [**&#39;pending&#39; | &#39;confirmed&#39; | &#39;rejected&#39;**]**Array<&#39;pending&#39; &#124; &#39;confirmed&#39; &#124; &#39;rejected&#39;>** | Фильтр по статусу | (optional) defaults to undefined|
| **page** | [**number**] | Номер страницы | (optional) defaults to 1|
| **limit** | [**number**] | Количество на странице | (optional) defaults to 20|


### Return type

**MainDonationsListResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **donationsIdGet**
> MainDonationWithDetails donationsIdGet()

Возвращает детальную информацию о пожертвовании

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: number; //ID пожертвования (default to undefined)

const { status, data } = await apiInstance.donationsIdGet(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | ID пожертвования | defaults to undefined|


### Return type

**MainDonationWithDetails**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**404** | Not Found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **donationsIdPatch**
> MainDonationUpdateResponse donationsIdPatch(request)

Обновляет статус пожертвования (подтвердить или отклонить)

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    MainUpdateDonationRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: number; //ID пожертвования (default to undefined)
let request: MainUpdateDonationRequest; //Статус

const { status, data } = await apiInstance.donationsIdPatch(
    id,
    request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **request** | **MainUpdateDonationRequest**| Статус | |
| **id** | [**number**] | ID пожертвования | defaults to undefined|


### Return type

**MainDonationUpdateResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **donationsPost**
> MainDonationResponse donationsPost()

Создает новое пожертвование для поста

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let postId: number; //ID поста (default to undefined)
let amount: number; //Сумма пожертвования (default to undefined)
let receipt: File; //Чек/скриншот (JPEG, PNG, PDF, до 10MB) (optional) (default to undefined)

const { status, data } = await apiInstance.donationsPost(
    postId,
    amount,
    receipt
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **postId** | [**number**] | ID поста | defaults to undefined|
| **amount** | [**number**] | Сумма пожертвования | defaults to undefined|
| **receipt** | [**File**] | Чек/скриншот (JPEG, PNG, PDF, до 10MB) | (optional) defaults to undefined|


### Return type

**MainDonationResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: multipart/form-data
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **filesBucketObjectKeyGet**
> filesBucketObjectKeyGet()

Получает файл из MinIO и отдает его клиенту (проксирование). Путь к файлу может содержать слэши, например: /files/user-photos/users/1/photo.jpg

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let bucket: string; //Название bucket (default to undefined)
let objectKey: string; //Ключ объекта (путь к файлу, может содержать слэши) (default to undefined)

const { status, data } = await apiInstance.filesBucketObjectKeyGet(
    bucket,
    objectKey
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bucket** | [**string**] | Название bucket | defaults to undefined|
| **objectKey** | [**string**] | Ключ объекта (путь к файлу, может содержать слэши) | defaults to undefined|


### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/octet-stream


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Файл |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **filesPresignedUrlPost**
> MainPresignedGetURLResponse filesPresignedUrlPost(request)

Генерирует presigned URL для чтения (скачивания) файла из MinIO

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    MainPresignedGetURLRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let request: MainPresignedGetURLRequest; //Параметры запроса

const { status, data } = await apiInstance.filesPresignedUrlPost(
    request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **request** | **MainPresignedGetURLRequest**| Параметры запроса | |


### Return type

**MainPresignedGetURLResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **healthGet**
> MainHealthCheckResponse healthGet()

Проверяет состояние сервера, подключение к базе данных и MinIO

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.healthGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**MainHealthCheckResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**503** | Service Unavailable |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **postsGet**
> MainPostsListResponse postsGet()

Возвращает список постов с пагинацией и фильтрацией

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let status: 'active' | 'completed' | 'closed' | 'moderated'; //Фильтр по статусу (optional) (default to undefined)
let userId: number; //Фильтр по автору (optional) (default to undefined)
let page: number; //Номер страницы (optional) (default to 1)
let limit: number; //Количество на странице (optional) (default to 20)

const { status, data } = await apiInstance.postsGet(
    status,
    userId,
    page,
    limit
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **status** | [**&#39;active&#39; | &#39;completed&#39; | &#39;closed&#39; | &#39;moderated&#39;**]**Array<&#39;active&#39; &#124; &#39;completed&#39; &#124; &#39;closed&#39; &#124; &#39;moderated&#39;>** | Фильтр по статусу | (optional) defaults to undefined|
| **userId** | [**number**] | Фильтр по автору | (optional) defaults to undefined|
| **page** | [**number**] | Номер страницы | (optional) defaults to 1|
| **limit** | [**number**] | Количество на странице | (optional) defaults to 20|


### Return type

**MainPostsListResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **postsIdDelete**
> postsIdDelete()

Удаляет пост (только автор может удалить)

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: number; //ID поста (default to undefined)

const { status, data } = await apiInstance.postsIdDelete(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | ID поста | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Успешно удалено |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Not Found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **postsIdGet**
> MainPostWithDetails postsIdGet()

Возвращает детальную информацию о посте

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: number; //ID поста (default to undefined)

const { status, data } = await apiInstance.postsIdGet(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | ID поста | defaults to undefined|


### Return type

**MainPostWithDetails**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**404** | Not Found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **postsIdMediaMediaIdDelete**
> postsIdMediaMediaIdDelete()

Удаляет медиа файл из поста

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: number; //ID поста (default to undefined)
let mediaId: number; //ID медиа (default to undefined)

const { status, data } = await apiInstance.postsIdMediaMediaIdDelete(
    id,
    mediaId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | ID поста | defaults to undefined|
| **mediaId** | [**number**] | ID медиа | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Успешно удалено |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **postsIdMediaPost**
> MainPostMedia postsIdMediaPost()

Добавляет медиа файл к существующему посту

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: number; //ID поста (default to undefined)
let media: File; //Медиа файл (изображение/видео, до 10MB) (default to undefined)

const { status, data } = await apiInstance.postsIdMediaPost(
    id,
    media
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | ID поста | defaults to undefined|
| **media** | [**File**] | Медиа файл (изображение/видео, до 10MB) | defaults to undefined|


### Return type

**MainPostMedia**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: multipart/form-data
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **postsIdPatch**
> MainPostUpdateResponse postsIdPatch(request)

Обновляет данные поста (только автор может редактировать)

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    MainUpdatePostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: number; //ID поста (default to undefined)
let request: MainUpdatePostRequest; //Данные для обновления

const { status, data } = await apiInstance.postsIdPatch(
    id,
    request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **request** | **MainUpdatePostRequest**| Данные для обновления | |
| **id** | [**number**] | ID поста | defaults to undefined|


### Return type

**MainPostUpdateResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Not Found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **postsPost**
> MainPostResponse postsPost()

Создает новый пост о помощи

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let title: string; //Заголовок (default to undefined)
let description: string; //Описание (default to undefined)
let amount: number; //Целевая сумма (default to undefined)
let recipient: string; //Получатель средств (default to undefined)
let bank: string; //Банк получателя (default to undefined)
let phone: string; //Телефон для связи (default to undefined)
let media: File; //Медиа файлы (максимум 10, каждый до 10MB) (optional) (default to undefined)

const { status, data } = await apiInstance.postsPost(
    title,
    description,
    amount,
    recipient,
    bank,
    phone,
    media
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **title** | [**string**] | Заголовок | defaults to undefined|
| **description** | [**string**] | Описание | defaults to undefined|
| **amount** | [**number**] | Целевая сумма | defaults to undefined|
| **recipient** | [**string**] | Получатель средств | defaults to undefined|
| **bank** | [**string**] | Банк получателя | defaults to undefined|
| **phone** | [**string**] | Телефон для связи | defaults to undefined|
| **media** | [**File**] | Медиа файлы (максимум 10, каждый до 10MB) | (optional) defaults to undefined|


### Return type

**MainPostResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: multipart/form-data
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **ratingsGet**
> MainRatingsListResponse ratingsGet()

Возвращает рейтинг пользователей с пагинацией

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let page: number; //Номер страницы (optional) (default to 1)
let limit: number; //Количество на странице (optional) (default to 50)

const { status, data } = await apiInstance.ratingsGet(
    page,
    limit
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **page** | [**number**] | Номер страницы | (optional) defaults to 1|
| **limit** | [**number**] | Количество на странице | (optional) defaults to 50|


### Return type

**MainRatingsListResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **ratingsMeGet**
> MainRatingWithDetails ratingsMeGet()

Возвращает рейтинг текущего пользователя с позицией

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.ratingsMeGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**MainRatingWithDetails**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **uploadPresignedUrlPost**
> MainPresignedURLResponse uploadPresignedUrlPost(request)

Генерирует presigned URL для прямой загрузки файла в MinIO

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    MainPresignedURLRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let request: MainPresignedURLRequest; //Параметры загрузки

const { status, data } = await apiInstance.uploadPresignedUrlPost(
    request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **request** | **MainPresignedURLRequest**| Параметры загрузки | |


### Return type

**MainPresignedURLResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **usersMeChangePasswordPost**
> MainSuccessResponse usersMeChangePasswordPost(request)

Изменяет пароль текущего пользователя

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    MainChangePasswordRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let request: MainChangePasswordRequest; //Старый и новый пароль

const { status, data } = await apiInstance.usersMeChangePasswordPost(
    request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **request** | **MainChangePasswordRequest**| Старый и новый пароль | |


### Return type

**MainSuccessResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **usersMeGet**
> MainUser usersMeGet()

Возвращает информацию о текущем пользователе

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.usersMeGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**MainUser**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **usersMePatch**
> MainUser usersMePatch(request)

Обновляет данные профиля текущего пользователя

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    MainUpdateProfileRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let request: MainUpdateProfileRequest; //Данные для обновления

const { status, data } = await apiInstance.usersMePatch(
    request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **request** | **MainUpdateProfileRequest**| Данные для обновления | |


### Return type

**MainUser**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **usersMePhotoPost**
> MainPhotoUploadResponse usersMePhotoPost()

Загружает фото профиля пользователя

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let photo: File; //Фото профиля (JPEG, PNG, max 5MB) (default to undefined)

const { status, data } = await apiInstance.usersMePhotoPost(
    photo
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **photo** | [**File**] | Фото профиля (JPEG, PNG, max 5MB) | defaults to undefined|


### Return type

**MainPhotoUploadResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: multipart/form-data
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**413** | Request Entity Too Large |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **verificationsGet**
> MainVerificationsListResponse verificationsGet()

Возвращает список всех заявок на верификацию с пагинацией

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let status: 'pending' | 'approved' | 'rejected'; //Фильтр по статусу (optional) (default to undefined)
let page: number; //Номер страницы (optional) (default to 1)
let limit: number; //Количество на странице (optional) (default to 20)

const { status, data } = await apiInstance.verificationsGet(
    status,
    page,
    limit
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **status** | [**&#39;pending&#39; | &#39;approved&#39; | &#39;rejected&#39;**]**Array<&#39;pending&#39; &#124; &#39;approved&#39; &#124; &#39;rejected&#39;>** | Фильтр по статусу | (optional) defaults to undefined|
| **page** | [**number**] | Номер страницы | (optional) defaults to 1|
| **limit** | [**number**] | Количество на странице | (optional) defaults to 20|


### Return type

**MainVerificationsListResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **verificationsIdPatch**
> MainVerificationResponse verificationsIdPatch(request)

Обновляет статус верификации (одобрить или отклонить)

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    MainUpdateVerificationRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: number; //ID верификации (default to undefined)
let request: MainUpdateVerificationRequest; //Статус и причина отклонения

const { status, data } = await apiInstance.verificationsIdPatch(
    id,
    request
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **request** | **MainUpdateVerificationRequest**| Статус и причина отклонения | |
| **id** | [**number**] | ID верификации | defaults to undefined|


### Return type

**MainVerificationResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **verificationsMeGet**
> MainVerificationResponse verificationsMeGet()

Возвращает статус верификации текущего пользователя

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.verificationsMeGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**MainVerificationResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **verificationsPost**
> MainVerificationResponse verificationsPost()

Создает заявку на верификацию пользователя

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let userPhoto: File; //Фото пользователя (default to undefined)
let lastName: string; //Фамилия (default to undefined)
let firstName: string; //Имя (default to undefined)
let birthDate: string; //Дата рождения (YYYY-MM-DD) (default to undefined)
let passportSeries: string; //Серия паспорта (default to undefined)
let passportNumber: string; //Номер паспорта (default to undefined)
let passportIssuer: string; //Кем выдан (default to undefined)
let passportDate: string; //Дата выдачи (YYYY-MM-DD) (default to undefined)
let docType: string; //Тип документа (inn или snils) (default to undefined)
let passportScans: File; //Сканы паспорта (минимум 2) (default to undefined)
let consent1: boolean; //Согласие 1 (default to undefined)
let consent2: boolean; //Согласие 2 (default to undefined)
let consent3: boolean; //Согласие 3 (default to undefined)
let middleName: string; //Отчество (optional) (default to undefined)
let inn: string; //ИНН (optional) (default to undefined)
let snils: string; //СНИЛС (optional) (default to undefined)

const { status, data } = await apiInstance.verificationsPost(
    userPhoto,
    lastName,
    firstName,
    birthDate,
    passportSeries,
    passportNumber,
    passportIssuer,
    passportDate,
    docType,
    passportScans,
    consent1,
    consent2,
    consent3,
    middleName,
    inn,
    snils
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **userPhoto** | [**File**] | Фото пользователя | defaults to undefined|
| **lastName** | [**string**] | Фамилия | defaults to undefined|
| **firstName** | [**string**] | Имя | defaults to undefined|
| **birthDate** | [**string**] | Дата рождения (YYYY-MM-DD) | defaults to undefined|
| **passportSeries** | [**string**] | Серия паспорта | defaults to undefined|
| **passportNumber** | [**string**] | Номер паспорта | defaults to undefined|
| **passportIssuer** | [**string**] | Кем выдан | defaults to undefined|
| **passportDate** | [**string**] | Дата выдачи (YYYY-MM-DD) | defaults to undefined|
| **docType** | [**string**]**Array<&#39;inn&#39; &#124; &#39;snils&#39;>** | Тип документа (inn или snils) | defaults to undefined|
| **passportScans** | [**File**] | Сканы паспорта (минимум 2) | defaults to undefined|
| **consent1** | [**boolean**] | Согласие 1 | defaults to undefined|
| **consent2** | [**boolean**] | Согласие 2 | defaults to undefined|
| **consent3** | [**boolean**] | Согласие 3 | defaults to undefined|
| **middleName** | [**string**] | Отчество | (optional) defaults to undefined|
| **inn** | [**string**] | ИНН | (optional) defaults to undefined|
| **snils** | [**string**] | СНИЛС | (optional) defaults to undefined|


### Return type

**MainVerificationResponse**

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

 - **Content-Type**: multipart/form-data
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**409** | Conflict |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

