import React from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import parse from 'html-react-parser';

function BlogList({ bloglist }) {
  let body = typeof bloglist.body === 'string' && bloglist.body.substr(0, 300);
  const stringLength = body.lastIndexOf(' ');
  body = `${body.substr(0, Math.min(body.length, stringLength))}...`;
  return (
    <div className='blog-list'>
      {bloglist.featured_image && (
        <Link to={bloglist.url}>
          <img className='blog-list-img' src={bloglist.featured_image.url} alt='blog img' />
        </Link>
      )}
      <div className='blog-content'>
        {bloglist.title && (
          <Link to={bloglist.url}>
            <h3>{bloglist.title}</h3>
          </Link>
        )}
        <p>
          {moment(bloglist.date).format('ddd, MMM D YYYY')},{' '}
          <strong>{bloglist.author[0].title}</strong>
        </p>
        {parse(body)}
        {bloglist.url ? (
          <Link to={bloglist.url}>
            <span>{'Read more -->'}</span>
          </Link>
        ) : (
          ''
        )}
      </div>
    </div>
  );
}

export default BlogList;
