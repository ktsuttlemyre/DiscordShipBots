const path = require('path');
const BoilerplateClient = require(path.join(__dirname,'/client/BoilerplateClient'));
require('dotenv').config();
const client = new BoilerplateClient({ owner: process.env.OWNERS, token: process.env.DISCORD_TOKEN });
const Sentry = require('@sentry/node');

// Load Logger
if (process.env.SENTRY_URL) {
	try {
		client.logger.log('Sentry Monitoring Loading...');
		Sentry.init({ dsn: process.env.SENTRY_URL, environment: process.env.NODE_ENV });
		client.logger.info('Sentry Monitoring Loaded and Ready!');
	}
	catch (e) {
		client.logger.error(e);
	}
}

client.on('disconnect', () => client.logger.warn('Connection lost...'))
	.on('reconnect', () => client.logger.info('Attempting to reconnect...'))
	.on('error', err => client.logger.error(err))
	.on('warn', info => client.logger.warn(info));
client.start();

process.on('unhandledRejection', err => {
	client.logger.error('An unhandled promise rejection occured');
	client.logger.stacktrace(err);
});




  //shutdown gracefully and clean up 
  process
  .on('SIGTERM', shutdown('SIGTERM'))
  .on('SIGINT', shutdown('SIGINT'))
  .on('uncaughtException', shutdown('uncaughtException'));
  function shutdown(signal) {
    return (err) => {
      console.log(`${ signal }...`);
      if (err){
        console.error(err.stack || err);
      }
      client.guilds.cache.forEach(function(guild){ //iter guilds
	guild.members.cache.some(function(member){ //iter members
		if(member.user.bot){ //ignore bots
			return false;
		}
		member.voice.setMute(false); //unmute anyone
		member.voice.setDeaf(false); //undefen anyone
	}); //end iter members
        
	var memory=client.memory
	if(!memory){return}
        var player=memory.get(guild, 'player');
	if(!player){return}
	var queues=memory.get(guild, 'queues')||[];
	queues.forEach(function(queue){
		var message = queue.firstMessage
		if(player.isPlaying(message)){
		  common.nowPlaying(message,null,'I have crashed or gone to sleep!')
		}	
	})
      }); //end iter guilds
      process.exit(err ? 1 : 0);

    };
  }//end graceful shutdown

