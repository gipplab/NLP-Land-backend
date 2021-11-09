import express, { NextFunction } from 'express';
import mongoose from 'mongoose';
import restify from 'express-restify-mongoose';
import * as DocumentTypes from '../models/interfaces';
import { APIOptions } from '../../config/interfaces';
import passport from 'passport';

export function initialize(
  model: mongoose.Model<DocumentTypes.Venue>,
  router: express.Router | express.Application,
  options: APIOptions
) {
  // venues endpoint
  restify.serve(router, model, {
    name: 'venues',
    preMiddleware: passport.authenticate('jwt'),
    prefix: options.server.prefix,
    version: options.server.version,
    preCreate: (req: any, _: express.Response, next: NextFunction) => {
      if (req.user.isAdmin) {
        // Add who created the venue and when
        req.body.createdBy = req.user._id;
        req.body.createdAt = new Date();
        return next();
      }

      return next({
        statusCode: 403,
        message: 'Only admins can create new venues using the venue API',
      });
    },

    // disable user modification, except for admins and the creator itself
    preUpdate: (req: any, _: express.Response, next: NextFunction) => {
      // extract requested user from request
      const document = <DocumentTypes.User>req?.erm?.document;

      // allow update for user of the venue and admins
      if (req.user.isAdmin || req.user._id.equals(document?._id)) {
        return next();
      }

      // disable for everybody else
      return next({
        statusCode: 403,
        message: 'Only admins or the user itself can update venues properties',
      });
    },

    // disable deletion, except for admins and the creator itself
    preDelete: (req: any, res: express.Response, next: NextFunction) => {
      // extract requested user from request
      const document = <DocumentTypes.User>req?.erm?.document;

      // allow update for user of the venue and admins
      if (req?.user?.isAdmin || req.user._id.equals(document?._id)) {
        return next();
      }

      // disable for everybody else
      return next({
        statusCode: 403,
        message: 'Only admins and the creator can delete a venue',
      });
    },
  });
}
