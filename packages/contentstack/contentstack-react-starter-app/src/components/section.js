import React from 'react';
import { Link } from 'react-router-dom';

export default function Section(props) {
  const { section } = props;
  function contentSection() {
    return (
      <div className='home-content' key='section-1'>
        {section.title_h2 && <h2 {...section.$?.title_h2}>{section.title_h2}</h2>}
        {section.description && <p {...section.$?.description}>{section.description}</p>}
        {section.call_to_action.title && section.call_to_action.href ? (
          <Link {...section.call_to_action.$?.title} to={section.call_to_action.href} className='btn secondary-btn'>
            {section.call_to_action.title}
          </Link>
        ) : (
          ''
        )}
      </div>
    );
  }

  function imageContent() {
    return <img {...section.image.$?.url} src={section.image.url} alt={section.image.filename} key='section-2' />;
  }
  return <div className='home-advisor-section'>{section.image_alignment === 'Left' ? [imageContent(), contentSection()] : [contentSection(), imageContent()]}</div>;
}
