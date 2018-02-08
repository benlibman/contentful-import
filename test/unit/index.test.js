import { resolve } from 'path'

import TableStub from 'cli-table2'
import pushToSpaceStub from 'contentful-batch-libs/dist/push/push-to-space'
import transformSpaceStub from 'contentful-batch-libs/dist/transform/transform-space'
import createClientsStub from 'contentful-batch-libs/dist/utils/create-clients'
import getDestinationResponseStub from '../../lib/get-destination-response'

import contentfulImport from '../../lib/index'

jest.mock('cli-table2')

jest.mock('../../lib/get-destination-response', () => {
  return jest.fn(() => Promise.resolve({
    entries: [
      { sys: { id: 'entry1' } },
      { sys: { id: 'entry2' } }
    ],
    assets: [
      { sys: { id: 'asset1' } },
      { sys: { id: 'asset2' } }
    ],
    contentTypes: [
      { sys: { id: 'contentType1' } },
      { sys: { id: 'contentType2' } }
    ],
    editorInterfaces: [
      { sys: { id: 'editorInterface1' } },
      { sys: { id: 'editorInterface2' } }
    ],
    locales: [{
      name: 'German (Germany)',
      internal_code: 'de-DE',
      code: 'de-DE',
      default: true
    }]
  }))
})
jest.mock('contentful-batch-libs/dist/push/push-to-space', () => {
  const Listr = require('listr')
  return jest.fn(() => {
    return new Listr([
      {
        title: 'Fake push to space',
        task: (ctx, task) => {
          ctx.data = ctx.source
        }
      }
    ])
  })
})
jest.mock('contentful-batch-libs/dist/transform/transform-space', () => {
  return jest.fn((data) => Promise.resolve(data))
})
jest.mock('contentful-batch-libs/dist/utils/create-clients', () => {
  return jest.fn(() => (
    { source: {delivery: {}}, destination: {management: {}} }
  ))
})

afterEach(() => {
  createClientsStub.mockClear()
  getDestinationResponseStub.mockClear()
  transformSpaceStub.mockClear()
  pushToSpaceStub.mockClear()
  TableStub.mockClear()
})

test('Runs Contentful Import', () => {
  return contentfulImport({
    content: {
      entries: [
        { sys: { id: 'entry1' } },
        { sys: { id: 'entry2' } }
      ],
      assets: [
        { sys: { id: 'asset1' } },
        { sys: { id: 'asset2' } }
      ],
      contentTypes: [
        { sys: { id: 'contentType1' } },
        { sys: { id: 'contentType2' } }
      ],
      editorInterfaces: [
        { sys: { id: 'editorInterface1' } },
        { sys: { id: 'editorInterface2' } }
      ],
      locales: [
        {
          name: 'German (Germany)',
          code: 'de-DE',
          default: true
        },
        {
          name: 'U.S. English',
          code: 'en-US',
          default: false
        }
      ]
    },
    spaceId: 'someSpaceId',
    managementToken: 'someManagementToken',
    errorLogFile: 'errorlogfile'
  })
    .then(() => {
      expect(createClientsStub.mock.calls).toHaveLength(1)
      expect(getDestinationResponseStub.mock.calls).toHaveLength(1)
      expect(transformSpaceStub.mock.calls).toHaveLength(1)
      expect(pushToSpaceStub.mock.calls).toHaveLength(1)

      const introTable = TableStub.mock.instances[0]
      expect(introTable.push.mock.calls[0][0]).toEqual([{colSpan: 2, content: 'The following entities are going to be imported:'}])
      expect(introTable.push.mock.calls[1][0]).toEqual(['Entries', 2])
      expect(introTable.push.mock.calls[2][0]).toEqual(['Assets', 2])
      expect(introTable.push.mock.calls[3][0]).toEqual(['Content Types', 2])
      expect(introTable.push.mock.calls[4][0]).toEqual(['Editor Interfaces', 2])
      expect(introTable.push.mock.calls[5][0]).toEqual(['Locales', 2])
      expect(introTable.push.mock.calls[6][0]).toEqual(['Webhooks', 0])
      expect(introTable.push.mock.calls).toHaveLength(7)

      const resultTable = TableStub.mock.instances[1]
      expect(resultTable.push.mock.calls[0][0]).toEqual([{colSpan: 2, content: 'Imported entities'}])
      expect(resultTable.push.mock.calls[1][0]).toEqual(['Entries', 2])
      expect(resultTable.push.mock.calls[2][0]).toEqual(['Assets', 2])
      expect(resultTable.push.mock.calls[3][0]).toEqual(['Content Types', 2])
      expect(resultTable.push.mock.calls[4][0]).toEqual(['Editor Interfaces', 2])
      expect(resultTable.push.mock.calls[5][0]).toEqual(['Locales', 2])
      expect(resultTable.push.mock.calls[6][0]).toEqual(['Webhooks', 0])
      expect(resultTable.push.mock.calls).toHaveLength(7)
    })
})

test('Creates a valid and correct opts object', () => {
  const errorLogFile = 'errorlogfile.json'
  const exampleConfig = require('../../example-config.json')

  return contentfulImport({
    errorLogFile,
    config: resolve(__dirname, '..', '..', 'example-config.json'),
    content: {}
  })
    .then(() => {
      const opts = createClientsStub.mock.calls[0][0]
      expect(opts.skipContentModel).toBeFalsy()
      expect(opts.errorLogFile).toBe(resolve(process.cwd(), errorLogFile))
      expect(opts.spaceId).toBe(exampleConfig.spaceId)
    })
})

test('Stops import when default locales does not match', () => {
  const errorLogFile = 'errorlogfile.json'
  expect.assertions(1)
  return contentfulImport({
    errorLogFile,
    config: resolve(__dirname, '..', '..', 'example-config.json'),
    content: {
      locales: [
        {
          name: 'German (Germany)',
          code: 'de-DE',
          default: false
        },
        {
          name: 'U.S English',
          code: 'en-US',
          default: true
        }
      ]
    }
  }).catch((err) => expect(err.name).toBe('ContentfulMultiError'))
})

test('Intro CLI table respects skipContentModel', () => {
  return contentfulImport({
    content: {
      entries: [
        { sys: { id: 'entry1' } },
        { sys: { id: 'entry2' } }
      ],
      assets: [
        { sys: { id: 'asset1' } },
        { sys: { id: 'asset2' } }
      ],
      contentTypes: [
        { sys: { id: 'contentType1' } },
        { sys: { id: 'contentType2' } }
      ],
      editorInterfaces: [
        { sys: { id: 'editorInterface1' } },
        { sys: { id: 'editorInterface2' } }
      ],
      locales: [
        {
          name: 'German (Germany)',
          code: 'de-DE',
          default: true
        },
        {
          name: 'U.S. English',
          code: 'en-US',
          default: false
        }
      ]
    },
    spaceId: 'someSpaceId',
    managementToken: 'someManagementToken',
    errorLogFile: 'errorlogfile',
    skipContentModel: true
  })
    .then(() => {
      const introTable = TableStub.mock.instances[0]
      expect(introTable.push.mock.calls[0][0]).toEqual([{colSpan: 2, content: 'The following entities are going to be imported:'}])
      expect(introTable.push.mock.calls[1][0]).toEqual(['Entries', 2])
      expect(introTable.push.mock.calls[2][0]).toEqual(['Assets', 2])
      expect(introTable.push.mock.calls[3][0]).toEqual(['Locales', 2])
      expect(introTable.push.mock.calls[4][0]).toEqual(['Webhooks', 0])
      expect(introTable.push.mock.calls).toHaveLength(5)
    })
})

test('Intro CLI table respects contentModelOnly', () => {
  return contentfulImport({
    content: {
      entries: [
        { sys: { id: 'entry1' } },
        { sys: { id: 'entry2' } }
      ],
      assets: [
        { sys: { id: 'asset1' } },
        { sys: { id: 'asset2' } }
      ],
      contentTypes: [
        { sys: { id: 'contentType1' } },
        { sys: { id: 'contentType2' } }
      ],
      editorInterfaces: [
        { sys: { id: 'editorInterface1' } },
        { sys: { id: 'editorInterface2' } }
      ],
      locales: [
        {
          name: 'German (Germany)',
          code: 'de-DE',
          default: true
        },
        {
          name: 'U.S. English',
          code: 'en-US',
          default: false
        }
      ]
    },
    spaceId: 'someSpaceId',
    managementToken: 'someManagementToken',
    errorLogFile: 'errorlogfile',
    contentModelOnly: true
  })
    .then(() => {
      const introTable = TableStub.mock.instances[0]
      expect(introTable.push.mock.calls[0][0]).toEqual([{colSpan: 2, content: 'The following entities are going to be imported:'}])
      expect(introTable.push.mock.calls[1][0]).toEqual(['Content Types', 2])
      expect(introTable.push.mock.calls[2][0]).toEqual(['Editor Interfaces', 2])
      expect(introTable.push.mock.calls[3][0]).toEqual(['Locales', 2])
      expect(introTable.push.mock.calls).toHaveLength(4)
    })
})

test('Intro CLI table respects contentModelOnly and skipLocales', () => {
  return contentfulImport({
    content: {
      entries: [
        { sys: { id: 'entry1' } },
        { sys: { id: 'entry2' } }
      ],
      assets: [
        { sys: { id: 'asset1' } },
        { sys: { id: 'asset2' } }
      ],
      contentTypes: [
        { sys: { id: 'contentType1' } },
        { sys: { id: 'contentType2' } }
      ],
      editorInterfaces: [
        { sys: { id: 'editorInterface1' } },
        { sys: { id: 'editorInterface2' } }
      ],
      locales: [
        {
          name: 'German (Germany)',
          code: 'de-DE',
          default: true
        },
        {
          name: 'U.S. English',
          code: 'en-US',
          default: false
        }
      ]
    },
    spaceId: 'someSpaceId',
    managementToken: 'someManagementToken',
    errorLogFile: 'errorlogfile',
    contentModelOnly: true,
    skipLocales: true
  })
    .then(() => {
      const introTable = TableStub.mock.instances[0]
      expect(introTable.push.mock.calls[0][0]).toEqual([{colSpan: 2, content: 'The following entities are going to be imported:'}])
      expect(introTable.push.mock.calls[1][0]).toEqual(['Content Types', 2])
      expect(introTable.push.mock.calls[2][0]).toEqual(['Editor Interfaces', 2])
      expect(introTable.push.mock.calls).toHaveLength(3)
    })
})
