import React from "react";
import HomeIcon from '@mui/icons-material/Home';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MovieIcon from '@mui/icons-material/Movie';
import FolderIcon from '@mui/icons-material/Folder';

export const SidebarData=[
    {
        title:"Home",
        icon:<HomeIcon />,
        link:"/",

    },
    {
        title:"Account",
        icon:<AccountCircleIcon  />,
        link:"/account",

    },
    {
        title:"My_Video",
        icon:<MovieIcon />,
        link:"/my_video",

    },
    {
        title:"My_List",
        icon:<FolderIcon />,
        link:"/playlists",

    }
]