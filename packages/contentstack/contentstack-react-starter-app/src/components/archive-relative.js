import React from 'react';
import { Link } from 'react-router-dom';
import parse from 'html-react-parser';

export default function ArchiveRelative(props) {
  const { blogs } = props;
  return (
    <>
      {blogs?.map((blog) => (
        <Link to={blog.url} key={blog.title}>
          <div {...blog.$?.body}>
            <h4 {...blog.$?.title}>{blog.title}</h4>
            <div {...blog.$?.body}>{parse(blog.body.slice(0, 80))}</div>
          </div>
        </Link>
      ))}
    </>
  );
}
