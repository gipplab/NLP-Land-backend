import { describe } from 'mocha';
import 'mocha';
import chai, { expect, should } from 'chai';
import chaiHttp from 'chai-http';
import { APIServer } from '../../../src/app/apiserver';
import { APIOptions } from '../../../src/config/interfaces';
import * as Setup from '../../setup';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';

const lodash = require('lodash');

chai.use(chaiHttp);

let apiServer: APIServer;
let apiOptions: APIOptions;
let userToken: string;

describe('/fe/citations', () => {
  const route = '/fe/citations';

  const dummyVenue = {
    _id: new mongoose.Types.ObjectId(),
    names: ['hello', 'world'],
    dblpId: 'some-id-123',
  };

  const dummyVenue2 = {
    _id: new mongoose.Types.ObjectId(),
    names: ['test'],
    dblpId: 'some-id-124',
  };

  const dummyAuthor = {
    _id: new mongoose.Types.ObjectId(),
    fullname: 'hello',
  };

  const dummyAuthor2 = {
    _id: new mongoose.Types.ObjectId(),
    fullname: 'test',
  };

  const dummyPaper = {
    title: 'Some Paper Title',
    abstractText: 'This paper is about a really interesting topic',
    doi: 'doi/1.23.123',
    pdfUrls: ['https://dummy-url.de/pdf.pdf'],
    absUrl: 'https://dummy-url.de/',
    yearPublished: 2022,
    inCitationsCount: 2,
    outCitationsCount: 2,
    authors: ['hello', 'test'],
    authorIds: [dummyAuthor._id, dummyAuthor2._id],
    venue: 'hello',
    venueId: dummyVenue._id,
    typeOfPaper: 'article',
    fieldsOfStudy: ['Computer Science', 'Art'],
    publisher: 'ABC',
    openAccess: true,
    dblpId: 'some-id-127',
    csvId: '1',
  };

  const dummyPaper2 = {
    _id: new mongoose.Types.ObjectId(),
    title: 'Some Paper Title',
    abstractText: 'This paper is about a really interesting topic',
    doi: 'doi/1.23.123',
    pdfUrls: ['https://dummy-url.de/pdf.pdf'],
    absUrl: 'https://dummy-url.de/',
    yearPublished: 2020,
    inCitationsCount: 0,
    outCitationsCount: 0,
    authorIds: null,
    venueId: null,
    typeOfPaper: 'article',
    dblpId: 'some-id-12',
    csvId: '2',
  };

  const dummyPaper3 = {
    title: 'Some Paper Title',
    abstractText: 'This paper is about a really interesting topic',
    doi: 'doi/1.23.123',
    pdfUrls: ['https://dummy-url.de/pdf.pdf'],
    absUrl: 'https://dummy-url.de/',
    yearPublished: 2022,
    inCitationsCount: 1,
    outCitationsCount: 0,
    authors: ['hello'],
    authorIds: [dummyAuthor._id],
    venue: 'hello',
    venueId: new mongoose.Types.ObjectId(),
    typeOfPaper: 'inproceedings',
    fieldsOfStudy: ['Computer Science'],
    publisher: 'CBA',
    openAccess: false,
    dblpId: 'some-id-129',
    csvId: '3',
  };

  before(async () => {
    await Setup.initDb();
    const { app, options } = await Setup.initApi();
    apiServer = app;
    apiOptions = options;
    const adminToken = (
      await chai
        .request(app.app)
        .post(`${options.server.baseRoute}/login`)
        .send(options.user.default)
    ).body.token;
    const adminUser = (
      await chai
        .request(app.app)
        .get(`${options.server.baseRoute}/users?query={"email":"${options.user.default.email}"}`)
        .set('Authorization', `Bearer ${adminToken}`)
    ).body[0];

    const dummyCreated = {
      createdAt: new Date(),
      createdBy: adminUser._id,
    };
    await apiServer.models.Venue.create(
      lodash.merge(dummyVenue, dummyCreated),
      lodash.merge(dummyVenue2, dummyCreated)
    );
    await apiServer.models.Author.create(
      lodash.merge(dummyAuthor, dummyCreated),
      lodash.merge(dummyAuthor2, dummyCreated)
    );
    await apiServer.models.Paper.create(
      lodash.merge(dummyPaper, dummyCreated),
      lodash.merge(dummyPaper2, dummyCreated),
      lodash.merge(dummyPaper3, dummyCreated)
    );

    await chai.request(apiServer.app).post(`${apiOptions.server.baseRoute}/register`).send({
      email: 'dummy@user.de',
      password: 'insecure',
      fullname: 'Your Name',
    });
    userToken = (
      await chai.request(apiServer.app).post(`${apiOptions.server.baseRoute}/login`).send({
        email: 'dummy@user.de',
        password: 'insecure',
      })
    ).body.token;
  });

  after(async () => {
    await Setup.clearDatabase(['papers', 'venues', 'authors']);
  });

  describe('No access', () => {
    describe('Unauthorized access', () => {
      specify('Unauthorized GET/In/years', (done) => {
        chai
          .request(apiServer.app)
          .get(`${apiOptions.server.baseRoute}${route}In/years`)
          .end((err, res) => {
            should().not.exist(err);
            expect(res).to.have.status(401);
            done();
          });
      });

      specify('Unauthorized GET/Out/years', (done) => {
        chai
          .request(apiServer.app)
          .get(`${apiOptions.server.baseRoute}${route}Out/years`)
          .end((err, res) => {
            should().not.exist(err);
            expect(res).to.have.status(401);
            done();
          });
      });
    });
  });

  describe('Successful access', () => {
    describe('GET/In/years', () => {
      specify('Successful GET/In/years', (done) => {
        chai
          .request(apiServer.app)
          .get(`${apiOptions.server.baseRoute}${route}In/years`)
          .set('Authorization', `Bearer ${userToken}`)
          .end((err, res) => {
            should().not.exist(err);
            expect(res).to.have.status(200);
            expect(res.body.years).to.be.an('array');
            expect(res.body.years[0]).to.equal(1936);
            expect(res.body.years[84]).to.equal(2020);
            expect(res.body.counts).to.be.an('array');
            expect(res.body.counts[0]).to.equal(0);
            expect(res.body.counts[86]).to.equal(3);
            done();
          });
      });

      specify('Successful GET/In/years: no results', (done) => {
        chai
          .request(apiServer.app)
          .get(`${apiOptions.server.baseRoute}${route}In/years?yearStart=2022&yearEnd=2020`)
          .set('Authorization', `Bearer ${userToken}`)
          .end((err, res) => {
            should().not.exist(err);
            expect(res).to.have.status(200);
            expect(res.body.years).to.be.an('array');
            expect(res.body.counts).to.be.an('array');
            expect(res.body.counts.every((count: number) => count === 0));
            done();
          });
      });
    });

    describe('GET/Out/years', () => {
      specify('Successful GET/Out/years', (done) => {
        chai
          .request(apiServer.app)
          .get(`${apiOptions.server.baseRoute}${route}Out/years`)
          .set('Authorization', `Bearer ${userToken}`)
          .end((err, res) => {
            should().not.exist(err);
            expect(res).to.have.status(200);
            expect(res.body.years).to.be.an('array');
            expect(res.body.years[0]).to.equal(1936);
            expect(res.body.years[84]).to.equal(2020);
            expect(res.body.counts).to.be.an('array');
            expect(res.body.counts[0]).to.equal(0);
            expect(res.body.counts[86]).to.equal(2);
            done();
          });
      });

      specify('Successful GET/Out/years: no results', (done) => {
        chai
          .request(apiServer.app)
          .get(`${apiOptions.server.baseRoute}${route}Out/years?yearStart=2022&yearEnd=2020`)
          .set('Authorization', `Bearer ${userToken}`)
          .end((err, res) => {
            should().not.exist(err);
            expect(res).to.have.status(200);
            expect(res.body.years).to.be.an('array');
            expect(res.body.counts).to.be.an('array');
            expect(res.body.counts.every((count: number) => count === 0));
            done();
          });
      });
    });
  });
});