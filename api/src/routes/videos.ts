import { Router } from 'express';
import videos from '../data/videos.json';
import { ApiError } from '../lib/errors';
import { paginate, sortBy } from '../lib/paginate';
import { idParams, listVideosQuery, parseOrThrow } from '../lib/validation';

export const videosRouter = Router();

videosRouter.get('/', (req, res) => {
  const query = parseOrThrow(listVideosQuery, req.query);

  const filtered = videos.filter(
    (v) =>
      (query.genre === undefined || v.genre === query.genre) &&
      (query.channelId === undefined || v.channelId === query.channelId) &&
      (query.minRating === undefined || v.rating >= query.minRating) &&
      (query.q === undefined || v.title.toLowerCase().includes(query.q.toLowerCase())),
  );

  res.json(paginate(sortBy(filtered, query.sortBy, query.order), query.page, query.limit));
});

videosRouter.get('/:id', (req, res) => {
  const { id } = parseOrThrow(idParams, req.params);
  const video = videos.find((v) => v.id === id);
  if (!video) throw new ApiError(404, 'NOT_FOUND', `Video with id ${id} not found`);
  res.json({ data: video });
});
