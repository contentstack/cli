import Stack from '../sdk/entry';
import { addEditableTags } from '@contentstack/utils';

const liveEdit = process.env.REACT_APP_CONTENTSTACK_LIVE_EDIT_TAGS === 'true';

export const getHeaderRes = async () => {
  const response = await Stack.getEntry({
    contentTypeUid: 'header',
    referenceFieldPath: ['navigation_menu.page_reference'],
    jsonRtePath: ['notification_bar.announcement_text'],
  });
  liveEdit && addEditableTags(response[0][0], 'header', true);
  return response[0][0];
};

export const getFooterRes = async () => {
  const response = await Stack.getEntry({
    contentTypeUid: 'footer',
    jsonRtePath: ['copyright'],
  });
  liveEdit && addEditableTags(response[0][0], 'footer', true);
  return response[0][0];
};

export const getAllEntries = async () => {
  const response = await Stack.getEntry({
    contentTypeUid: 'page',
  });
  liveEdit && addEditableTags(response[0], 'page', true);
  return response[0];
};

export const getPageRes = async (entryUrl) => {
  const response = await Stack.getEntryByUrl({
    contentTypeUid: 'page',
    entryUrl,
    referenceFieldPath: ['page_components.from_blog.featured_blogs'],
    jsonRtePath: [
      'page_components.from_blog.featured_blogs.body',
      'page_components.section_with_buckets.buckets.description',
      'page_components.section_with_html_code.description',
    ],
  });
  liveEdit && addEditableTags(response[0], 'page', true);
  return response[0];
};

export const getBlogListRes = async () => {
  const response = await Stack.getEntry({
    contentTypeUid: 'blog_post',
    referenceFieldPath: ['author', 'related_post'],
    jsonRtePath: ['body'],
  });
  liveEdit && addEditableTags(response[0], 'blog_post', true);
  return response[0];
};

export const getBlogPostRes = async (entryUrl) => {
  const response = await Stack.getEntryByUrl({
    contentTypeUid: 'blog_post',
    entryUrl,
    referenceFieldPath: ['author', 'related_post'],
    jsonRtePath: ['body', 'related_post.body'],
  });
  liveEdit && addEditableTags(response[0], 'blog_post', true);
  return response[0];
};
