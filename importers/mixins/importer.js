const fetch = require('node-fetch');
const cronParser = require('cron-parser');
const { promises: fsPromises } = require("fs");
const { ACTIVITY_TYPES } = require("@semapps/activitypub");
const { MIME_TYPES } = require("@semapps/mime-types");
const ImporterMixin = require('./importer');

module.exports = {
  mixins: [ImporterMixin],
  settings: {
    source: {
      apiUrl: null,
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
    },
    activitypub: {
      actorUri: null,
      activities: [ACTIVITY_TYPES.CREATE, ACTIVITY_TYPES.UPDATE, ACTIVITY_TYPES.DELETE]
    },
    cronJob: {
      time: null,
      timeZone: 'Europe/Paris'
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

      await this.actions.deleteImported();

      if( this.settings.source.getAllCompact ) {
        const compactResults = await this.list(this.settings.source.getAllCompact);

        this.logger.info(`Importing ${compactResults.length} items from ${this.settings.source.getAllCompact}...`);

        for( let data of compactResults ) {
          const sourceUri = this.settings.source.getOneFull(data);
          const destUri = await this.actions.importOne({ sourceUri }, { parentCtx: ctx });
          if( destUri ) this.imported[sourceUri] = destUri;
        }
      } else if( this.settings.source.getAllFull ) {
        const fullResults = await this.list(this.settings.source.getAllFull);

        this.logger.info(`Importing ${fullResults.length} items from ${this.settings.source.getAllFull}...`);

        for( let data of fullResults ) {
          const sourceUri = this.settings.source.getOneFull && this.settings.source.getOneFull(data);
          const destUri = await this.actions.importOne({ sourceUri, data }, { parentCtx: ctx });
          if( destUri ) this.imported[sourceUri] = destUri;
        }
      } else {
        throw new Error('You must define the setting source.getAllCompact or source.getAllFull');
      }

      this.logger.info(`Import finished !`);
    },
    synchronize() {
      if( this.createJob ) {
        this.createJob(this.name, 'synchronize', {});
      } else {
        return this.processSynchronize({ progress: number => this.broker.info(`Progress: ${number}%`) });
      }
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

          this.logger.info('Done! Resource URL: ' + destUri);
        }

        return destUri;
      }
    },
    async deleteImported(ctx) {
      for (const resourceUri of Object.values(this.imported)) {
        this.logger.info(`Deleting ${resourceUri}...`);

        // TODO also delete blank nodes attached to the resources
        await ctx.call('ldp.resource.delete', {
          resourceUri,
          webId: 'system'
        });
      }

      this.imported = {};
    },
    getImported() {
      return this.imported;
    }
  },
  methods: {
    async transform(data) {
      throw new Error('The transform method must be implemented by the service');
    },
    async list(url) {
      return await this.fetch(url);
    },
    async getOne(url) {
      return await this.fetch(url);
    },
    async fetch(param) {
      if( typeof param === 'object' ) {
        const { url, ...fetchOptions } = param;
        const headers = { ...this.settings.source.headers, ...this.settings.source.fetchOptions.headers, ...fetchOptions.headers };
        const response = await fetch(url, { ...this.settings.source.fetchOptions, ...fetchOptions, headers })
        if( response.ok ) {
          return await response.json();
        } else {
          return false;
        }
      } else if( param.startsWith('http') ) {
        // Parameter is an URL
        const headers = { ...this.settings.source.headers, ...this.settings.source.fetchOptions.headers };
        const response = await fetch(param, { ...this.settings.source.fetchOptions, headers });
        if( response.ok ) {
          return await response.json();
        } else {
          return false;
        }
      } else {
        // Parameter is a file
        try {
          const file = await fsPromises.readFile(param);
          return JSON.parse(file.toString());
        } catch(e) {
          this.logger.warn('Could not read file ' + param);
          return false;
        }
      }
    },
    async postActivity(type, resourceUri) {
      if( this.settings.activitypub.actorUri && this.settings.activitypub.activities.includes(type) ) {
        const outbox = await this.broker.call('activitypub.actor.getCollectionUri', { actorUri: this.settings.activitypub.actorUri, predicate: 'outbox' });
        const followers = await this.broker.call('activitypub.actor.getCollectionUri', { actorUri: this.settings.activitypub.actorUri, predicate: 'followers' });

        await this.broker.call(
          'activitypub.outbox.post',
          {
            collectionUri: outbox,
            type,
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
      let deletedUris = {}, createdUris = {}, updatedUris = {};
      const compactResults = await this.list(this.settings.source.getAllCompact);

      job.progress(5);

      const newSourceUris = compactResults.map(data => this.settings.source.getOneFull(data));
      const oldSourceUris = Object.keys(this.imported);

      job.progress(10);

      ///////////////////////////////////////////
      // DELETED RESOURCES
      ///////////////////////////////////////////

      const urisToDelete = oldSourceUris.filter(uri => !newSourceUris.includes(uri));
      for( let sourceUri of urisToDelete ) {
        this.logger.info('Resource ' + sourceUri + ' does not exist anymore, deleting it...');

        await this.broker.call('ldp.resource.delete', {
          resourceUri: this.imported[sourceUri],
          webId: 'system'
        });

        await this.postActivity(ACTIVITY_TYPES.DELETE, this.imported[sourceUri]);

        deletedUris[sourceUri] = this.imported[sourceUri];

        // Remove resource from local cache
        delete this.imported[sourceUri];
      }

      job.progress(40);

      ///////////////////////////////////////////
      // CREATED RESOURCES
      ///////////////////////////////////////////

      const urisToCreate = newSourceUris.filter(uri => !oldSourceUris.includes(uri));
      for( let sourceUri of urisToCreate ) {
        this.logger.info('Resource ' + sourceUri + ' did not exist, importing it...');

        const destUri = await this.actions.importOne({ sourceUri });

        if( destUri ) {
          await this.postActivity(ACTIVITY_TYPES.CREATE, destUri);

          createdUris[sourceUri] = destUri;

          // Add resource to local cache
          this.imported[sourceUri] = destUri;
        }
      }

      job.progress(70);

      ///////////////////////////////////////////
      // UPDATED RESOURCES
      ///////////////////////////////////////////

      const interval = cronParser.parseExpression(this.settings.cronJob.time, { tz: this.settings.cronJob.timeZone });
      const previousUpdate = new Date(interval.prev().toISOString());
      console.log('previousUpdate', previousUpdate);
      const urisToUpdate = compactResults
        .filter(data => {
          // If an updated field is available in compact results, filter out older items
          const updated = this.getField('updated', data);
          return updated ? (new Date(updated)) > previousUpdate : true
        })
        .map(data => this.settings.source.getOneFull(data))
        .filter(uri => !urisToCreate.includes(uri));

      for( let sourceUri of urisToUpdate ) {
        const result = await this.actions.importOne({ sourceUri, destUri: this.imported[sourceUri] });

        if( result ) {
          await this.postActivity(ACTIVITY_TYPES.UPDATE, this.imported[sourceUri]);

          updatedUris[sourceUri] = this.imported[sourceUri];
        } else {
          await this.broker.call('ldp.resource.delete', {
            resourceUri: this.imported[sourceUri],
            webId: 'system'
          });

          await this.postActivity(ACTIVITY_TYPES.DELETE, this.imported[sourceUri]);

          deletedUris[sourceUri] = this.imported[sourceUri];

          // Remove resource from local cache
          delete this.imported[sourceUri];
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
