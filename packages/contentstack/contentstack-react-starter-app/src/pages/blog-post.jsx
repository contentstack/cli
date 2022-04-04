import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import moment from 'moment';
import parse from 'html-react-parser';

import ArchiveRelative from '../components/archive-relative';
import RenderComponents from '../components/render-components';
import { onEntryChange } from '../sdk/entry';
import { getPageRes, getBlogPostRes } from '../helper';
import Skeleton from 'react-loading-skeleton';

export default function BlogPost(props) {
  const { entry } = props;
  const { blogId } = useParams();
  const history = useNavigate();
  const [getEntry, setEntry] = useState({ banner: {}, post: {} });
  const [error, setError] = useState(false);

  async function fetchData() {
    try {
      const entryUrl = blogId ? `/blog/${blogId}` : '/';
      const banner = await getPageRes('/blog');
      const post = await getBlogPostRes(entryUrl);
      (!banner || !post) && setError(true);
      setEntry({ banner, post });
      entry({ page: banner, blogPost: post });
    } catch (error) {
      console.error(error);
      setError(true);
    }
  }

  useEffect(() => {
    onEntryChange(fetchData);
  }, []);
  useEffect(() => {
    error && history('/404');
  }, [error]);

  useEffect(() => {
    if (getEntry.post.url !== `/blog/${blogId}`) {
      fetchData();
    }
  }, [getEntry.post, blogId]);

  const { post, banner } = getEntry;
  return (
    <>
      {banner ? (
        <RenderComponents
          pageComponents={banner.page_components}
          blogsPage
          contentTypeUid='blog_post'
          entryUid={banner.uid}
          locale={banner.locale}
        />
      ) : (
        <Skeleton height={400} />
      )}

      <div className='blog-container'>
        <article className='blog-detail'>
          {post.title ? (
            <h2 {...post.$?.title}>{post.title}</h2>
          ) : (
            <h2>
              <Skeleton />
            </h2>
          )}
          {post.date ? (
            <p {...post.$?.date}>
              {moment(post.date).format('ddd, MMM D YYYY')},{' '}
              <strong {...post.author[0].$?.title}>
                {post.author[0].title}
              </strong>
            </p>
          ) : (
            <p>
              <Skeleton width={300}/>
            </p>
          )}
          {post.body ? (
            <div {...post.$?.body}>{parse(post.body)}</div>
          ) : (
            <Skeleton height={800} width={600} />
          )}
        </article>
        <div className='blog-column-right'>
          <div className='related-post'>
            {Object.keys(banner).length && banner.page_components[2].widget ? (
              <h2 {...banner?.page_components[2].widget.$?.title_h2}>
                {banner?.page_components[2].widget.title_h2}
              </h2>
            ) : (
              <h2>
                <Skeleton />
              </h2>
            )}
            {post.related_post ? (
              <ArchiveRelative
                {...post.$?.related_post}
                blogs={post.related_post}
              />
            ) : (
              <Skeleton width={300} height={500} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
