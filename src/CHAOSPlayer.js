(function()
{
	var clientGUID = "DCC822C8-AFD9-4E8C-90BE-06962111A398";

	var documentIsReady = false;
	var videoPath = null;
	var thumbPath = null;
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
			client.Object_GetByObjectGUID(ClientGetObjectByGUIDCallback, settings.objectGUID, false, true, false);
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
							videoPath = object.Files[i].URL;
							break;
						case "Image":
							thumbPath = object.Files[i].URL;
							break;
					}
				}

				AddPlayer();
			}
			else
				ReportError("Object not found");
		}
		else
		{
			ReportError("Service error: " + (serviceResult.WasSuccess() ? serviceResult.MCM().Error() : serviceResult.Error()));
		}
	}

	function AddPlayer()
	{
		if(videoPath == null || !documentIsReady)
			return;
		
		jwplayer("PlayerContainer").setup({
			flashplayer: "../lib/jwplayer/player.swf",
			file: videoPath.replace(new RegExp("\\\\", "g"), "/"),
			image: thumbPath.replace(new RegExp("\\\\", "g"), "/"),
			height: "100%",
			width: "100%"
		});
	}

	function ReportError(message)
	{
		$("#PlayerContainer").text(message);
	}
})();