import path from 'path';
import helmet from 'helmet';
import { FSDB } from 'file-system-db';
import { Store } from 'express-session';
import { configure, JourneyContext, Plan, waypointUrl } from "@dwp/govuk-casa";
import express, { Request, Response } from 'express';

import nameFields from './definition/fields/name';
import surnameFields from './definition/fields/surname';

const db = new FSDB(path.join(__dirname,"./db.json"), false);

const app = (
  name: string,
  secret: string,
  ttl: number,
  secure: boolean,
  sessionStore: Store,
) => {
  const casaApp = express();
  casaApp.use(helmet.noSniff());

  const viewDir = path.join(__dirname, './views/');
  const localesDir = path.join(__dirname, './locales/');

  const plan = new Plan();
  plan.addSequence('name','surname','url:///start/');

  const { mount, ancillaryRouter } = configure({
    views: [viewDir],
    i18n: {
      dirs: [localesDir],
      locales: ['en'],
    },
    session: {
      name,
      secret,
      ttl,
      secure,
      store: sessionStore,
    },
    pages: [
      {
        waypoint: 'name',
        view: 'pages/name.njk',
        fields: nameFields
      },
      {
        waypoint: 'surname',
        view: 'pages/surname.njk',
        fields: surnameFields
      },
    ],
    plan
  });

  ancillaryRouter.use('/start', (req: Request, res: Response) => {
    const journeyContext = JourneyContext.getDefaultContext(req.session);
    const name = journeyContext.getDataForPage('name') as { firstName: string };
    const surname = journeyContext.getDataForPage('surname') as { surname: string };
    if(!name && !surname) {
      const firstName = db.get('firstName');
      const surname = db.get('surname');
      journeyContext.setDataForPage('name', { firstName });
      journeyContext.setDataForPage('surname', { surname });
    }
    res.render('pages/start.njk');
  });

  ancillaryRouter.get('/details', (req: Request, res: Response) => {
    const journeyContext = JourneyContext.getDefaultContext(req.session);
    const {firstName} = journeyContext.getDataForPage('name') as { firstName: string };
    const {surname} = journeyContext.getDataForPage('surname') as { surname: string };

    console.log({firstName,surname});
    console.log({ all: journeyContext.getData() });

    const rows = [
      {
          key: { text: 'Name' },
          value: { text: firstName },
          actions: {
          items: [
              {
              text: 'Change',
              visuallyHiddenText: 'Change',
              href: waypointUrl({
                  waypoint: 'name',
                  mountUrl: '/',
                  edit: true,
                  editOrigin: '/details'
              })
              }
          ]
          }
      },
      {
          key: { text: 'Surname' },
          value: { text: surname },
          actions: {
          items: [
              {
              text: 'Change',
              visuallyHiddenText: 'Change',
              href: waypointUrl({
                  waypoint: 'surname',
                  mountUrl: '/',
                  edit: true,
                  editOrigin: '/details'
              })
              }
          ]
          }
      },
    ];

    res.locals.rows = rows;
    res.render('pages/details.njk');
  });

  ancillaryRouter.post('/details', (req: Request, res: Response) => {
    // save details 
    const journeyContext = JourneyContext.getDefaultContext(req.session);
    const {firstName} = journeyContext.getDataForPage('name') as { firstName: string };
    const {surname} = journeyContext.getDataForPage('surname') as { surname: string };

    db.set("firstName", firstName);
    db.set("surname", surname);
    res.redirect('/start');
  });

  return mount(casaApp, {});
}

export default app;
