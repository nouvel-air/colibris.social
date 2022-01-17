const fetch = require('node-fetch');
const { promises: fsPromises } = require("fs");
const { ACTIVITY_TYPES } = require("@semapps/activitypub");
const { MIME_TYPES } = require("@semapps/mime-types");
const ImporterMixin = require('./importer');

module.exports = {
  mixins: [ImporterMixin],
  settings: {
    source: {
      baseUrl: null,
      getAllFull: null,
      getAllCompact: null,
      getOneFull: null,
      headers: {
        Accept: 'application/json',
      },
      basicAuth: {
        user: '',
        password: ''
      },
      fetchOptions: {},
      fieldsMapping: {
        slug: null,
        created: null,
        updated: null,
      },
    },
    dest: {
      containerUri: null,
      predicatesToKeep: [], // Don't remove these predicates when updating data
      actorUri: null,
    },
    cronJob: {
      time: null,
      timeZone: 'Europe/Paris',
      updateInterval: 24 * 60 // Filter out resources older than (in minutes)
    }
  },
  dependencies: ['triplestore'],
  created() {
    if( this.settings.source.basicAuth.user ) {
      this.settings.source.headers.Authorization = 'Basic ' + Buffer.from(this.settings.source.basicAuth.user + ':' + this.settings.source.basicAuth.password).toString('base64')
    }

    // Configure the queue here so that the queue can be named after the service name
    this.schema.queues = {
      [this.name]: {
        name: 'synchronize',
        process: this.processSynchronize
      }
    }
  },
  async started() {
    const result = await this.broker.call('triplestore.query', {
      query: `
        PREFIX dc: <http://purl.org/dc/terms/>
        SELECT ?id ?sourceUri
        WHERE {
          ?id dc:source ?sourceUri.
          FILTER regex(str(?sourceUri), "^${this.settings.source.apiUrl}")
        }
      `,
      accept: MIME_TYPES.JSON,
      webId: 'system'
    });

    this.imported = Object.fromEntries(result.map(node => [node.sourceUri.value, node.id.value]));

    if( this.settings.cronJob.time ) {
      // See https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#queueadd
      this.createJob(this.name, 'synchronize', {}, { repeat: { cron: this.settings.cronJob.time, tz: this.settings.cronJob.timeZone } });
    }
  },
  actions: {
    async freshImport(ctx) {
      this.logger.info('Clearing all existing data...');

      // TODO also delete blank nodes attached to the resources
      await ctx.call('ldp.container.clear', {
        containerUri: this.settings.dest.containerUri,
        webId: 'system'
      });

      if( this.settings.source.getAllCompact ) {
        const compactResults = await this.list(this.settings.source.getAllCompact);

        this.logger.info(`Importing ${compactResults.length} items from ${this.settings.source.getAllCompact}...`);

        for( let data of compactResults ) {
          const sourceUri = this.settings.source.getOneFull(data);
          await this.actions.importOne({ sourceUri }, { parentCtx: ctx });
        }
      } else if( this.settings.source.getAllFull ) {
        const fullResults = await this.list(this.settings.source.getAllFull);

        this.logger.info(`Importing ${fullResults.length} items from ${this.settings.source.getAllFull}...`);

        for( let data of fullResults ) {
          const sourceUri = this.settings.source.getOneFull && this.settings.source.getOneFull(data);
          await this.actions.importOne({ sourceUri, data }, { parentCtx: ctx });
        }
      } else {
        throw new Error('You must define the setting source.getAllCompact or source.getAllFull');
      }

      this.logger.info(`Import finished !`);
    },
    synchronize() {
      this.createJob(this.name, 'synchronize', {});
    },
    async importOne(ctx) {
      let { sourceUri, destUri, data } = ctx.params;

      if( !data ) {
        data = await this.getOne(sourceUri);

        if (!data) {
          this.logger.warn('Invalid ' + sourceUri + '...');
          return false;
        }
      }

      const resource = await this.transform(data);

      // If resource is false, it means it is not published
      if (!resource) {
        if (destUri) {
          this.logger.info('Deleting ' + destUri + '...');
          await ctx.call('ldp.resource.delete', {
            resourceUri: destUri,
            webId: 'system'
          });
        } else {
          this.logger.info('Skipping ' + sourceUri + '...');
        }
        return false;
      } else {
        if (destUri) {
          const oldData = await ctx.call('ldp.resource.get', {
            resourceUri: destUri,
            accept: MIME_TYPES.JSON,
            webId: 'system'
          });

          const oldUpdatedDate = oldData['dc:modified'];
          const newUpdatedDate = this.getField('updated', data);

          if( !oldUpdatedDate || !newUpdatedDate || (new Date(newUpdatedDate)) > (new Date(oldUpdatedDate)) ) {
            this.logger.info('Reimporting ' + sourceUri + '...');

            const oldDataToKeep = this.settings.dest.predicatesToKeep.length > 0
              ? Object.fromEntries(Object.entries(oldData).filter(([key]) => this.settings.dest.predicatesToKeep.includes(key)))
              : {};

            await ctx.call('ldp.resource.put', {
              resource: {
                '@id': destUri,
                ...resource,
                ...oldDataToKeep,
                'dc:source': sourceUri,
                'dc:created': this.getField('created', data),
                'dc:modified': this.getField('updated', data),
                'dc:creator': this.settings.dest.actorUri
              },
              contentType: MIME_TYPES.JSON,
              webId: 'system'
            });
          } else {
            this.logger.info('Skipping ' + sourceUri + ' (it has not changed)...');
            return false;
          }
        } else {
          this.logger.info('Importing ' + sourceUri + '...');

          destUri = await ctx.call('ldp.container.post', {
            containerUri: this.settings.dest.containerUri,
            slug: this.getField('slug', data),
            resource: {
              ...resource,
              'dc:source': sourceUri,
              'dc:created': this.getField('created', data),
              'dc:modified': this.getField('updated', data),
              'dc:creator': this.settings.dest.actorUri
            },
            contentType: MIME_TYPES.JSON,
            webId: 'system'
          });
        }

        this.logger.info('Done! Resource URL: ' + destUri);

        return destUri;
      }
    }
  },
  methods: {
    async transform(data) {
      throw new Error('The transform method must be implemented');
    },
    async list(url) {
      return await this.fetch(url);
    },
    async getOne(url) {
      return await this.fetch(url);
    },
    async fetch(urlOrPath) {
      if( urlOrPath.startsWith('http') ) {
        const response = await fetch(urlOrPath, { headers: this.settings.source.headers, ...this.settings.source.fetchOptions });
        if( response.ok ) {
          return await response.json();
        } else {
          return false;
        }
      } else {
        try {
          const file = await fsPromises.readFile(urlOrPath);
          return JSON.parse(file.toString());
        } catch(e) {
          this.logger.warn('Could not read file ' + urlOrPath);
          return false;
        }
      }
    },
    async announceNewResource(resourceUri) {
      if( this.settings.dest.actorUri ) {
        const outbox = await this.broker.call('activitypub.actor.getCollectionUri', { actorUri: this.settings.dest.actorUri, predicate: 'outbox' });
        const followers = await this.broker.call('activitypub.actor.getCollectionUri', { actorUri: this.settings.dest.actorUri, predicate: 'followers' });

        await this.broker.call(
          'activitypub.outbox.post',
          {
            collectionUri: outbox,
            type: ACTIVITY_TYPES.ANNOUNCE,
            object: resourceUri,
            to: followers
          },
          { meta: { webId: this.settings.dest.actorUri } }
        );
      }
    },
    getField(fieldKey, data) {
      const fieldMapping = this.settings.source.fieldsMapping[fieldKey];
      if( fieldMapping ) {
        return typeof fieldMapping === 'function' ? fieldMapping.bind(this)(data) : data[fieldMapping]
      }
    },
    async processSynchronize(job) {
      const compactResults = await this.list(this.settings.source.getAllCompact);

      job.progress(5);

      const newSourceUris = compactResults.map(data => this.settings.source.getOneFull(data));
      const oldSourceUris = Object.keys(this.imported);

      job.progress(10);

      ///////////////////////////////////////////
      // DELETED RESOURCES
      ///////////////////////////////////////////

      const deletedUris = oldSourceUris.filter(uri => !newSourceUris.includes(uri));
      for( let sourceUri of deletedUris ) {
        this.logger.info('Resource ' + sourceUri + ' does not exist anymore, deleting it...');

        await this.broker.call('ldp.resource.delete', {
          resourceUri: this.imported[sourceUri],
          webId: 'system'
        });

        // Remove resource from local cache
        delete this.imported[sourceUri];
      }

      job.progress(40);

      ///////////////////////////////////////////
      // CREATED RESOURCES
      ///////////////////////////////////////////

      const possiblyCreatedUris = newSourceUris.filter(uri => !oldSourceUris.includes(uri));
      let createdUris = [];
      for( let sourceUri of possiblyCreatedUris ) {
        this.logger.info('Resource ' + sourceUri + ' did not exist, importing it...');

        const destUri = await this.actions.importOne({ sourceUri });

        if( destUri ) {
          await this.announceNewResource(destUri);

          // Add resource to local cache
          this.imported[sourceUri] = destUri;

          createdUris.push(sourceUri);
        }
      }

      job.progress(70);

      ///////////////////////////////////////////
      // UPDATED RESOURCES
      ///////////////////////////////////////////

      const previousUpdate = Date.now() - (this.settings.cronJob.updateInterval * 60 * 1000);
      const possiblyUpdatedUris = compactResults
        .filter(data => {
          // If an updated field is available in compact results, filter out older items
          const updated = this.getField('updated', data);
          return updated ? (new Date(updated)) > previousUpdate : true
        })
        .map(data => this.settings.source.getOneFull(data))
        .filter(uri => !createdUris.includes(uri));
      let updatedUris = []

      for( let sourceUri of possiblyUpdatedUris ) {
        const result = await this.actions.importOne({ sourceUri, destUri: this.imported[sourceUri] });
        if( result ) {
          updatedUris.push(sourceUri);
        }
      }

      job.progress(100);

      return {
        deletedUris,
        createdUris,
        updatedUris
      };
    }
  }
};
