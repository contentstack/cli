import React from 'react';
import { Link } from 'react-router-dom';
import Skeleton from 'react-loading-skeleton';

export default function HeroBanner(props) {
  const banner = props.hero_banner;
  return (
    <div
      className='hero-banner'
      style={{
        background: banner.bg_color ? banner.bg_color : '',
      }}
    >
      <div
        className='home-content'
        style={{ color: banner.text_color ? banner.text_color : '#222' }}
      >
        <h1 {...banner.$?.banner_title} className='hero-title'>
          {banner.banner_title || <Skeleton />}
        </h1>

        {banner.banner_description ? (
          <p
            {...banner.$?.banner_description}
            className='hero-description'
            style={{ color: banner.text_color ? banner.text_color : '#737b7d' }}
          >
            {banner.banner_description}
          </p>
        ) : (
          ''
        )}
        {banner.call_to_action.title && banner.call_to_action.href ? (
          <Link
            {...banner.call_to_action.$?.title}
            to={banner.call_to_action.href}
            className='btn tertiary-btn'
          >
            {banner.call_to_action.title}
          </Link>
        ) : (
          ''
        )}
      </div>
      {banner.banner_image ? (
        <img
          {...banner.banner_image.$?.url}
          alt={banner.banner_image.filename}
          src={banner.banner_image.url}
        />
      ) : (
        ''
      )}
    </div>
  );
}
