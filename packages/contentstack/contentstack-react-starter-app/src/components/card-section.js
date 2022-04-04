import React from 'react';
import { Link } from 'react-router-dom';

export default function CardSection(props) {
  const { cards } = props;
  return (
    <div className='demo-section'>
      {cards?.map((card) => (
        <div className='cards' key={card.title_h3}>
          {card.title_h3 && <h3 {...card.$?.title_h3}>{card.title_h3}</h3>}
          {card.description && <p {...card.$?.description}>{card.description}</p>}
          <div className='card-cta'>
            {card.call_to_action.title && card.call_to_action.href && (
              <Link to={card.call_to_action.href} className='btn primary-btn' {...card.call_to_action.$?.title}>
                {card.call_to_action.title}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
