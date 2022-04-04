import React from 'react';
import { Link } from 'react-router-dom';
import parse from 'html-react-parser';

export default function BlogSection(props) {
  const fromBlog = props.blogs;
  return (
    <div className='community-section'>
      <div className='community-head'>
        {fromBlog.title_h2 && <h2 {...fromBlog.$?.title_h2}>{fromBlog.title_h2}</h2>}
        {fromBlog.view_articles && (
          <Link to={fromBlog.view_articles.href} className='btn secondary-btn article-btn' {...fromBlog.view_articles.$?.title}>
            {fromBlog.view_articles.title}
          </Link>
        )}
      </div>
      <div className='home-featured-blogs'>
        {fromBlog.featured_blogs.map((blog) => (
          <div className='featured-blog' key={blog.title}>
            {blog.featured_image && <img src={blog.featured_image.url} alt={blog.featured_image.filename} className='blog-post-img' {...blog.featured_image.$?.url} />}
            <div className='featured-content'>
              {blog.title && <h3 {...blog.$?.title}>{blog.title}</h3>}

              <div {...blog.$?.body}>{blog.body && parse(blog.body.slice(0, 300))}</div>
              {blog.url && (
                <Link to={blog.url} className='blogpost-readmore'>
                  {'Read More -->'}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
