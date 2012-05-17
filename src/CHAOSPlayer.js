var settings = $.deparam.fragment();
var documentIsReady = false;
var videoPath = null;
var thumbPath = null;
var client = null;

if(settings.objectGUID)
	client = new PortalClient("http://api.chaos-systems.com", "DCC822C8-AFD9-4E8C-90BE-06962111A398");
else
	ReportError("objectGUID not set");

client.SessionCreated().Add(function ()
{
	client.EmailPassword_Login(null, "", ""); 
});

client.SessionAuthenticated().Add(function ()
{
	client.Object_GetByObjectGUID(ClientGetObjectByGUIDCallback, settings.objectGUID, false, true, false);
});

$(document).ready(function (event)
{
	documentIsReady = true;
	AddPlayer();
});

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
				switch(filePath = object.Files[i].Format)
				{
					case "SMK video":
						videoPath = object.Files[i].URL;
						break;
					case "SMK asset thumbnail":
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
		file: videoPath,
		image: thumbPath,
		height: "100%",
		width: "100%"
	});
}

function ReportError(message)
{
	$("#PlayerContainer").text(message);
}