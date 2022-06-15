module.exports = {
  name: 'importer.all',
  actions: {
    async freshImport(ctx) {
      await ctx.call('importer.services.freshImport');
      await ctx.call('importer.status.freshImport');
      await ctx.call('importer.types.freshImport');

      await ctx.call('importer.articles.freshImport');
      await ctx.call('importer.courses.freshImport');
      await ctx.call('importer.local-groups.freshImport');
      await ctx.call('importer.products.freshImport');
      await ctx.call('importer.projects.freshImport');
      await ctx.call('importer.needs.freshImport');

      await ctx.call('importer.hosting-services.freshImport');

      await ctx.call('importer.places.freshImport');
      await ctx.call('importer.events.freshImport');

      await ctx.call('theme-bot.generateBots');
    }
  }
};
