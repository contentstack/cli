import React from 'react';

export default function BlogBanner(props) {
  const { blog_banner } = props;
  return (
    <div className='blog-page-banner' style={{ background: `${blog_banner?.bg_color}` }}>
      <div className='blog-page-content'>
        {blog_banner.banner_title && (
          <h1 {...blog_banner.$?.banner_title} className='hero-title'>
            {blog_banner.banner_title}
          </h1>
        )}

        {blog_banner.banner_description && (
          <p {...blog_banner.$?.banner_description} className='hero-description'>
            {blog_banner.banner_description}
          </p>
        )}
      </div>
    </div>
  );
}
