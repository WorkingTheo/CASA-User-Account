import { field, validators as r } from '@dwp/govuk-casa';

export default [
  field('firstName').validators([
    r.required.make({
      errorMsg: 'Name is required'
    }),
  ]),
];
