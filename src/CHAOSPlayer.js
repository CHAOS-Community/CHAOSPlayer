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
							thumbnailFile = GetBestThumbnail(thumbnailFile, object.Files[i])
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
	
	function GetBestVideoFile(currentCandidate, newCandidate, findHTTPFile)
	{
		if(findHTTPFile && newCandidate.Token == "HTTP Download")
		{
			if(currentCandidate == null || newCandidate.URL.indexOf(".mp4") != -1)
				return newCandidate;
		}
		else if(!findHTTPFile && newCandidate.Token == "RTMP Streaming")
		{
			if(currentCandidate == null || newCandidate.URL.indexOf(".mp4") != -1)
				return newCandidate;
		}
		
		return currentCandidate;
	}

	function GetBestThumbnail(currentCandidate, newCandidate)
	{
		return currentCandidate == null ||
			newCandidate.FormatCategory.toLocaleLowerCase() == "thumbnail" ||
			(currentCandidate.FormatCategory.toLocaleLowerCase() != "thumbnail" && newCandidate.FormatCategory.toLocaleLowerCase().indexOf("thumbnail") != -1)
			? newCandidate : currentCandidate;
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

		var options = {
			modes: modes,
			events: { onPlay: PlayerPlay, onError: PlayerError },
			height: "100%",
			width: "100%"
		};

		if(thumbnailFile != null)
		options.image = thumbnailFile.URL.replace(new RegExp("\\\\", "g"), "/");

		jwplayer("Player").setup(options);
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