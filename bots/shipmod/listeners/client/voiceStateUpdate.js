var debug = false; 
const { Listener } = require('discord-akairo');
const util = require.main.require('./util');
const config = util.config;
const commandVars = util.commandVars(__filename);

class CustomListener extends Listener {
	constructor() {
		super(commandVars.name, {
			emitter: commandVars.category,
			event: commandVars.name,
			category: commandVars.category,
		});
	}

	async exec( oldstate, newstate, startupTriggered ) {
		debug && console.log('Event[voiceStateUpdate] => started')
		if(oldstate.partial || newstate.partial){
			console.log('Event[voiceStateUpdate] => isPartial')
			return
		}
		var env = process.env.ENVIRONMENT
        	if(env != 'production'){
			debug && console.log('Event[voiceStateUpdate] => env not production')
			return;
		}
		let member = newstate.member;
		if(member.user.bot){
			debug && console.log('Event[voiceStateUpdate] => member is bot')
			return
		}
		let guild = newstate.guild;
		
		let client = this.client;
		let bot = client.me || client.user;
		let logChannel = guild.channels.resolve(config.actionLogChannel);
		
		
		let changed ={	
			channelID: oldstate.channelID !== newstate.channelID,
			deaf: oldstate.deaf !== newstate.deaf,
			mute: oldstate.mute !== newstate.mute,
			selfDeaf: oldstate.selfDeaf !== newstate.selfDeaf,
			selfMute: oldstate.selfMute !== newstate.selfMute,
			selfVideo: oldstate.selfVideo !== newstate.selfVideo,
			serverDeaf: oldstate.serverDeaf !== newstate.serverDeaf,
			serverMute: oldstate.serverMute !== newstate.serverMute,
			speaking: oldstate.speaking !== newstate.speaking,
			streaming: oldstate.streaming !== newstate.streaming
		}
		debug && console.log(`voiceStateUpdate Triggered for user ${member.tag} with state`,changed)
		
		// voice-text-channel-link
		let roomChanged = ((oldstate.channelID || newstate.channelID) && oldstate.channelID !== newstate.channelID);
		let channelMap = config.voiceTextLinkMap;
		
		
		let permissionsNeeded = ['VIEW_CHANNEL','MANAGE_CHANNELS'];
		
		debug && console.info('voiceStateUpdate',oldstate.channelID,newstate.channelID,roomChanged,member.displayName);
		    
		//enter new chatroom
		debug && console.log('checking channel map',JSON.stringify(channelMap))
		let textChannelID = channelMap[newstate.channelID];
		let textChannel = guild.channels.cache.get(textChannelID);
		
		if(textChannel){
			let memberPermissionToViewChannel = textChannel.permissionsFor(member).has('VIEW_CHANNEL', false);
			if(!memberPermissionToViewChannel){
				debug && console.log('entering a hidden channel',textChannelID)
				let permissions = textChannel.permissionsFor(bot)
				if(permissions.has(permissionsNeeded)){
					let promise = await textChannel.updateOverwrite(member, {
					    //SEND_MESSAGES: false,
					    VIEW_CHANNEL: true
					});
					debug && console.log('showed hidden channel',textChannel.name)
				}else{
					console.log(`${me.displayName||me.tag} does not have permission to change permissions in `+textChannel.name)
				}
			}
		}

		
		//leave old chatroom (if they left a room)
		textChannelID = channelMap[oldstate.channelID];
		textChannel = guild.channels.cache.get(textChannelID);
		if(roomChanged && textChannel){ //if they actually left a channel because the id changed
			let let memberPermissionToViewChannel = textChannel.permissionsFor(member).has('VIEW_CHANNEL', false); = textChannel.permissionsFor(member).has('VIEW_CHANNEL', false);
			if(memberPermissionToViewChannel){
				debug && console.log('leaving a hidden channel',textChannelID)
				let permissions = textChannel.permissionsFor(bot)
				//console.log(permissions.toArray())
				if(permissions.has(permissionsNeeded)){
					//leave private rooms
					let promise = await textChannel.updateOverwrite(member, {
					    //SEND_MESSAGES: false,
					    VIEW_CHANNEL: false
					});
					debug && console.log('hide hidden channel',textChannel.name)
				}else{
					console.log(`${bot.displayName||bot.tag} does not have permission to change permissions in `+textChannel.name)
				}
			}
		}
		
		/************************ End startup Trigger **************/
		if(startupTriggered){
			return
		}
		//handle amongus mute mode
// 		if(newstate.channelID && changed.selfMute){ //if in a channel and mute state changed
// 			let amongusMode = this.client.memory.channelGet(newstate, 'amongusMode');
// 			//mute handler
// 			if(amongusMode){
// 				newstate.channel.members.forEach(function(member){
// 					if(member.id == member.id){return}
//					if(member.user.bot){return}
// 					member.voice.setMute(newstate.mute);
// 				}); //end members

// 			}
// 		}
				
		let joinLeaveConfig=config.voiceJoinLeave
		
		
		
		//only work if this is a real event and the channel has changed
		if(changed.channelID){ //channel changed
			if(newstate.channel){
				
				let roleName = `🗣️`;
				let role = guild.roles.cache.find((x) => x.name === roleName);

				//can this bot manage roles?
				if (bot.hasPermission("MANAGE_ROLES")) {
					//now add the role to the user if they arent already a part
					if (!member.roles.cache.some((role) => role.name === roleName)) {
						member.roles.add(role);
						logChannel && logChannel.permissionsFor(bot).has("SEND_MESSAGES") && logChannel.send(`Assigned role \`${role.name}\` to \`${member.displayName||member.tag}\``)
					}
				}
				
			
				permissions = newstate.channel.permissionsFor(bot);
				//reset the users status removing serverMute and serverDeafen if they do not have the voicemute or voicedeaf role
				if(!newstate.member.user.bot && (joinLeaveConfig.resetUserState || oldstate.channelID == oldstate.guild.afkChannelID)){
					if(permissions.has('MUTE_MEMBERS')){
						!member.roles.cache.some(role => role.name === config.roles.VoiceMute) && newstate.setMute(false);
					}else{
						console.log(`${bot} does not have permissions to set mute state to ${member} in ${newstate.channel.name}`)
					}
					if(permissions.has('DEAFEN_MEMBERS')){
						!member.roles.cache.some(role => role.name === config.roles.VoiceDeaf) && newstate.setDeaf(false);
					}else{
						console.log(`${bot} does not have permissions to set deafen state to ${member} in ${newstate.channel.name}`)
					}
				}
				//mute if entering afkChannel
// 				if(newstate.channelID == newstate.guild.afkChannelID){
// 					if(permissions.has('MUTE_MEMBERS')){
// 					   newstate.setMute(true);
// 					}else{
// 						console.log(`${bot} does not have permissions to mute ${member} in ${newstate.channel.name}`)
// 					}
// 					if(permissions.has(['DEAFEN_MEMBERS'])){
// 						newstate.setDeaf(true);
// 					}else{
// 						console.log(`${bot} does not have permissions to deafen ${member} in ${newstate.channel.name}`)
// 					}
//				}

				// play themetones
				if(joinLeaveConfig.tones && joinLeaveConfig.tones.on){
					if(oldstate.channelID != oldstate.guild.afkChannelID){
						await util.playThemeTone(oldstate.channel,joinLeaveConfig.tones.defaultLeaveTone);
					}
					if(newstate.channelID != newstate.guild.afkChannelID){
						await util.playThemeTone(newstate.channel,member.id);
					}
				}
				//client.commandHandler.runCommand(message,client.commandHandler.findCommand('clip'),member.id);
			}
		}
		
		
		
	    
	}
}

module.exports = CustomListener;
