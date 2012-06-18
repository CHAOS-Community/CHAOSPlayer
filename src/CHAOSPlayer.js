(function()
{
	var clientGUID = "DCC822C8-AFD9-4E8C-90BE-06962111A398";

	var documentIsReady = false;
	var objectParsed = false;
	var haveReportedPlay = false;
	var rtmpVideoFile = null;
	var httpVideoFile = null;
	var thumbnailFile = null;
	var client = null;

	var settings = $.deparam.fragment();

	$(document).ready(function (event)
	{
		documentIsReady = true;
		AddPlayer();
	});

	if(settings.objectGUID)
	{
		var sessionGUIDSet = typeof settings.sessionGUID != "undefined";
		
		client = new PortalClient(settings.servicePath, clientGUID, !sessionGUIDSet);

		client.SessionAcquired().Add(function ()
		{
			client.Object_GetByObjectGUID(ClientGetObjectByGUIDCallback, settings.objectGUID, settings.accessPointGUID , false, true, false);
		});
		
		if(sessionGUIDSet)
			client.SetSessionGUID(settings.sessionGUID);
	}
	else
		ReportError("objectGUID not set");

	function ClientGetObjectByGUIDCallback(serviceResult)
	{
		if(serviceResult.WasSuccess() && serviceResult.MCM().WasSuccess())
		{
			var objects = serviceResult.MCM().Results();

			if(objects.length != 0)
			{
				object = objects[0];

				for(var i = 0; i < object.Files.length; i++)
				{
					switch(object.Files[i].FormatType)
					{
						case "Video":
							httpVideoFile = GetBestVideoFile(httpVideoFile, object.Files[i], true);
							rtmpVideoFile = GetBestVideoFile(rtmpVideoFile, object.Files[i], false);
							break;
						case "Image":
							if(thumbnailFile == null)
								thumbnailFile = object.Files[i];
							break;
					}
				}

				if(httpVideoFile == null && rtmpVideoFile == null)
					ReportError("No video found on object");
				else
				{
					objectParsed = true;
					AddPlayer();
				}
			}
			else
				ReportError("Object not found");
		}
		else
		{
			ReportError("Service error: " + (serviceResult.WasSuccess() ? serviceResult.MCM().Error() : serviceResult.Error()));
		}
	}
	
	function GetBestVideoFile(file1, file2, httpFile)
	{
		if(httpFile && file2.Token == "HTTP Download")
		{
			if(file1 == null || file2.URL.indexOf(".mp4") != -1)
				return file2;
		}
		else if(!httpFile && file2.Token == "RTMP Streaming")
		{
			if(file1 == null || file2.URL.indexOf(".mp4") != -1)
				return file2;
		}
		
		return file1;
	}

	function AddPlayer()
	{
		if(!objectParsed || !documentIsReady)
			return;
		
		var modes = [];
		var flashMode = { type: "flash", src: "../lib/jwplayer/player.swf"};

		modes.push(flashMode);
		
		if(rtmpVideoFile != null)
		{
			var path = rtmpVideoFile.URL.replace(new RegExp("\\\\", "g"), "/"); //TODO: This should not be necessary, server side bug.
			path = path.replace(new RegExp("//", "g"), "/"); //TODO: This should not be necessary, server side bug.
			path = path.replace(new RegExp("rtmp:/", "g"), "rtmp://");
			
			if(path.indexOf(".flv") != -1)
				path = path.replace("mp4:", ""); //TODO: This should not be necessary, server side bug.
			
			var pathData = new RegExp("^(rtmp://.+?/.+?)/(.+)$", "").exec(path);
			
			flashMode.config = {
								file: pathData[2],
								streamer: pathData[1],
								provider: "rtmp"
								};
		}
		else if(httpVideoFile != null)
		{
			flashMode.config = { file: httpVideoFile.URL.replace(new RegExp("\\\\", "g"), "/") };
		}

		if(httpVideoFile != null)
			modes.push({ type: "html5", config: { file: httpVideoFile.URL.replace(new RegExp("\\\\", "g"), "/") }});

		jwplayer.utils.log = function(msg, obj)
		{
			if (typeof console != "undefined" && typeof console.log != "undefined")
			{
				if (obj) 
					console.log(msg, obj);
				else 
					console.log(msg);
			}
			if (msg == "No suitable players found")
				ShowRequiresFlash();
		};

		jwplayer("Player").setup({
			modes: modes,
			image: thumbnailFile.URL.replace(new RegExp("\\\\", "g"), "/"),
			events: { onPlay: PlayerPlay, onError: PlayerError },
			height: "100%",
			width: "100%"
		});
	}
	
	function PlayerPlay(oldstate)
	{
		if(haveReportedPlay || typeof settings.repositoryIdentifier == "undefined")
			return;
		haveReportedPlay = true;
		
		client.StatsObject_Set(null, settings.repositoryIdentifier, settings.objectGUID, settings.objectTypeID, settings.objectCollectionID, settings.channelIdentifier, settings.channelTypeID, settings.eventTypeID, settings.objectTitle, "", "", "", 0);
	}
	
	function PlayerError(message)
	{
		ReportError(message);
	}

	function ReportError(message)
	{
		$(".PlayerContainer").hide();
		$(".ErrorContainer").show();
		$(".ErrorMessage").text(typeof message.message == "undefined" ? message : message.message);
	}
	
	function ShowRequiresFlash()
	{
		$(".PlayerContainer").hide();
		$(".FlashRequiredContainer").show();
	}
})();