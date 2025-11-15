import React from 'react';
import { useApp } from '../context/AppContext';

const PostsList = ({ posts = [], onOpenPost }) => {
  const { loading } = useApp();
  const postsToShow = posts && posts.length > 0 ? posts : [];

  if (loading && postsToShow.length === 0) {
    return (
      <div className="content-section active">
        <h2>Благотворительные посты</h2>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (postsToShow.length === 0) {
    return (
      <div className="content-section active">
        <h2>Благотворительные посты</h2>
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <p>Пока нет доступных постов</p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            Если посты должны отображаться, проверьте подключение к серверу через компонент ApiTest.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-section active">
      <h2>Благотворительные посты</h2>
      <div className="posts-list">
        {postsToShow.map((post) => (
          <div
            key={post.id || Math.random()}
            className="post-card"
            onClick={() => onOpenPost(post)}
            style={{
              padding: '15px',
              margin: '10px 0',
              border: '1px solid #ccc',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: '#fff',
            }}
          >
            <h3 style={{ marginBottom: '10px' }}>{post.title || 'Без названия'}</h3>
            <p style={{ marginBottom: '10px', color: '#666' }}>
              {post.description || 'Описание отсутствует'}
            </p>
            {post.amount && (
              <p style={{ fontWeight: 'bold', color: '#007bff' }}>
                Цель: {post.amount} ₽
              </p>
            )}
            {post.status && (
              <span style={{
                display: 'inline-block',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: post.status === 'active' ? '#28a745' : '#6c757d',
                color: 'white',
                fontSize: '12px',
                marginTop: '10px',
              }}>
                {post.status}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PostsList;

