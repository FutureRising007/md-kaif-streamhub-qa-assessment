import { Router } from 'express';
import channels from '../data/channels.json';
import { ApiError } from '../lib/errors';
import { paginate, sortBy } from '../lib/paginate';
import { idParams, listChannelsQuery, parseOrThrow } from '../lib/validation';

export const channelsRouter = Router();

channelsRouter.get('/', (req, res) => {
  const query = parseOrThrow(listChannelsQuery, req.query);

  const filtered = channels.filter(
    (c) =>
      (query.country === undefined || c.country === query.country) &&
      (query.verified === undefined || c.verified === query.verified),
  );

  res.json(paginate(sortBy(filtered, query.sortBy, query.order), query.page, query.limit));
});

channelsRouter.get('/:id', (req, res) => {
  const { id } = parseOrThrow(idParams, req.params);
  const channel = channels.find((c) => c.id === id);
  if (!channel) throw new ApiError(404, 'NOT_FOUND', `Channel with id ${id} not found`);
  res.json({ data: channel });
});
