import { type DataSource, In } from 'typeorm';

import { Country } from '../../entities/Country';
import { State } from '../../entities/State';

import type { SeedInterface } from '../seed.interface';
import type { User } from '@/database/entities/User';
import { StateType } from '@/types/enums';

type StateSeed = Required<Pick<State, 'code' | 'name' | 'slug' | 'type'>>;

const US_STATES: readonly StateSeed[] = [
  { code: 'AL', name: 'Alabama', slug: 'alabama', type: StateType.STATE },
  { code: 'AK', name: 'Alaska', slug: 'alaska', type: StateType.STATE },
  { code: 'AZ', name: 'Arizona', slug: 'arizona', type: StateType.STATE },
  { code: 'AR', name: 'Arkansas', slug: 'arkansas', type: StateType.STATE },
  { code: 'CA', name: 'California', slug: 'california', type: StateType.STATE },
  { code: 'CO', name: 'Colorado', slug: 'colorado', type: StateType.STATE },
  { code: 'CT', name: 'Connecticut', slug: 'connecticut', type: StateType.STATE },
  { code: 'DE', name: 'Delaware', slug: 'delaware', type: StateType.STATE },
  { code: 'FL', name: 'Florida', slug: 'florida', type: StateType.STATE },
  { code: 'GA', name: 'Georgia', slug: 'georgia', type: StateType.STATE },
  { code: 'HI', name: 'Hawaii', slug: 'hawaii', type: StateType.STATE },
  { code: 'ID', name: 'Idaho', slug: 'idaho', type: StateType.STATE },
  { code: 'IL', name: 'Illinois', slug: 'illinois', type: StateType.STATE },
  { code: 'IN', name: 'Indiana', slug: 'indiana', type: StateType.STATE },
  { code: 'IA', name: 'Iowa', slug: 'iowa', type: StateType.STATE },
  { code: 'KS', name: 'Kansas', slug: 'kansas', type: StateType.STATE },
  { code: 'KY', name: 'Kentucky', slug: 'kentucky', type: StateType.STATE },
  { code: 'LA', name: 'Louisiana', slug: 'louisiana', type: StateType.STATE },
  { code: 'ME', name: 'Maine', slug: 'maine', type: StateType.STATE },
  { code: 'MD', name: 'Maryland', slug: 'maryland', type: StateType.STATE },
  { code: 'MA', name: 'Massachusetts', slug: 'massachusetts', type: StateType.STATE },
  { code: 'MI', name: 'Michigan', slug: 'michigan', type: StateType.STATE },
  { code: 'MN', name: 'Minnesota', slug: 'minnesota', type: StateType.STATE },
  { code: 'MS', name: 'Mississippi', slug: 'mississippi', type: StateType.STATE },
  { code: 'MO', name: 'Missouri', slug: 'missouri', type: StateType.STATE },
  { code: 'MT', name: 'Montana', slug: 'montana', type: StateType.STATE },
  { code: 'NE', name: 'Nebraska', slug: 'nebraska', type: StateType.STATE },
  { code: 'NV', name: 'Nevada', slug: 'nevada', type: StateType.STATE },
  { code: 'NH', name: 'New Hampshire', slug: 'new-hampshire', type: StateType.STATE },
  { code: 'NJ', name: 'New Jersey', slug: 'new-jersey', type: StateType.STATE },
  { code: 'NM', name: 'New Mexico', slug: 'new-mexico', type: StateType.STATE },
  { code: 'NY', name: 'New York', slug: 'new-york', type: StateType.STATE },
  { code: 'NC', name: 'North Carolina', slug: 'north-carolina', type: StateType.STATE },
  { code: 'ND', name: 'North Dakota', slug: 'north-dakota', type: StateType.STATE },
  { code: 'OH', name: 'Ohio', slug: 'ohio', type: StateType.STATE },
  { code: 'OK', name: 'Oklahoma', slug: 'oklahoma', type: StateType.STATE },
  { code: 'OR', name: 'Oregon', slug: 'oregon', type: StateType.STATE },
  { code: 'PA', name: 'Pennsylvania', slug: 'pennsylvania', type: StateType.STATE },
  { code: 'RI', name: 'Rhode Island', slug: 'rhode-island', type: StateType.STATE },
  { code: 'SC', name: 'South Carolina', slug: 'south-carolina', type: StateType.STATE },
  { code: 'SD', name: 'South Dakota', slug: 'south-dakota', type: StateType.STATE },
  { code: 'TN', name: 'Tennessee', slug: 'tennessee', type: StateType.STATE },
  { code: 'TX', name: 'Texas', slug: 'texas', type: StateType.STATE },
  { code: 'UT', name: 'Utah', slug: 'utah', type: StateType.STATE },
  { code: 'VT', name: 'Vermont', slug: 'vermont', type: StateType.STATE },
  { code: 'VA', name: 'Virginia', slug: 'virginia', type: StateType.STATE },
  { code: 'WA', name: 'Washington', slug: 'washington', type: StateType.STATE },
  { code: 'WV', name: 'West Virginia', slug: 'west-virginia', type: StateType.STATE },
  { code: 'WI', name: 'Wisconsin', slug: 'wisconsin', type: StateType.STATE },
  { code: 'WY', name: 'Wyoming', slug: 'wyoming', type: StateType.STATE },
  {
    code: 'DC',
    name: 'District of Columbia',
    slug: 'district-of-columbia',
    type: StateType.TERRITORY,
  },
  { code: 'PR', name: 'Puerto Rico', slug: 'puerto-rico', type: StateType.TERRITORY },
  { code: 'GU', name: 'Guam', slug: 'guam', type: StateType.TERRITORY },
  {
    code: 'VI',
    name: 'U.S. Virgin Islands',
    slug: 'us-virgin-islands',
    type: StateType.TERRITORY,
  },
  {
    code: 'US-FED',
    name: 'Federal (SAM.gov)',
    slug: 'federal',
    type: StateType.FEDERAL,
  },
];

export default class AddedAllUSStates1720800002 implements SeedInterface {
  name = 'AddedAllUSStates1720800002';

  public async up(dataSource: DataSource, systemUser?: User): Promise<void> {
    if (!systemUser) {
      throw new Error('System user not found');
    }
    const countryRepo = dataSource.getRepository(Country);
    const stateRepo = dataSource.getRepository(State);

    // 1. Find or create United States country
    let country = await countryRepo.findOne({ where: { code: 'USA' } });
    if (!country) {
      country = countryRepo.create({
        code: 'USA',
        name: 'United States of America',
        slug: 'united-states-of-america',
        isActive: true,
        createdById: systemUser.id,
        updatedById: systemUser.id,
      });
      country = await countryRepo.save(country);
    }

    const existingCodes = new Set(
      (
        await stateRepo.find({
          where: { countryId: country.id },
          select: { code: true },
        })
      ).map((state) => state.code),
    );

    const states = US_STATES.filter(({ code }) => !existingCodes.has(code)).map((state) =>
      stateRepo.create({
        ...state,
        countryId: country.id,
        createdById: systemUser.id,
        updatedById: systemUser.id,
      }),
    );

    if (states.length > 0) {
      await stateRepo.save(states);
    }
  }

  public async down(dataSource: DataSource): Promise<void> {
    const stateRepo = dataSource.getRepository(State);
    const codes = US_STATES.map((s) => s.code);
    await stateRepo.delete({ code: In(codes) });
  }
}
