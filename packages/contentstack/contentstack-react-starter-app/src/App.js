import React, { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Home from './pages/index.jsx';
import Blog from './pages/blog.jsx';
import BlogPost from './pages/blog-post.jsx';
import Layout from './components/layout.js';
import Error from './pages/error.jsx';
import './styles/third-party.css';
import './styles/style.css';
import './styles/modal.css';
import '@contentstack/live-preview-utils/dist/main.css';
import 'react-loading-skeleton/dist/skeleton.css';

function App() {
  const [getEntry, setEntry] = useState();

  function getPageRes(response) {
    setEntry(response);
  }
  return (
    <div className='App'>
      <Routes>
        <Route path='/' element={<Layout entry={getEntry} />}>
          <Route index element={<Home entry={getPageRes} />} />
          <Route path='/:page' element={<Home entry={getPageRes} />} />
          <Route path='/blog' element={<Blog entry={getPageRes} />} />
          <Route
            path='/blog/:blogId'
            element={<BlogPost entry={getPageRes} />}
          />
          <Route path='/404' element={<Error />}></Route>
          <Route path='*' element={<Error />}></Route>
        </Route>
      </Routes>
    </div>
  );
}

export default App;
