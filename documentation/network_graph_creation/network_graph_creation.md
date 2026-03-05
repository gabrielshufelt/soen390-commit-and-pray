# Introduction
The goal of this file is to document the creation of our indoor navigation network graphs from building floor plans. This document includes all the necessary steps to go from raw floor plan -> navigable map for indoor directions.

# Prepare PNG  & SVG Layers
## Gathering the Floor Plans
The first step is to gather all the raw floor plans. We got ours from the "floor_plans" provided by the prof, as well as through the Concordia locker rental's website. Most of them are in png, jpg, pdf, or sometimes svg.

## Preparing the PNGs
The second step is to convert the raw floor plans into 2048x2048 png images. Try to make the floor plan fit the full size of the image, leaving the least amount of white space as possible.

## Setup Inkscape Document
The third step is to create a new inkscape document, set the background to white, and set the page size to 2048px x 2048px. Enable snapping with the magnet icon.

## Setup Layers
Create the following 2 layers: png, and walls.
* `walls` layer: will contain the polygons that map out each room on the floor. Set the opacity of this layer to 50% and place it on top of the png layer. Make it transparent.
* `png` layer: contains just the 2048x2048 png from step 2. Align this layer into the center of the page and lock it.

![](/documentation/network_graph_creation/image.png)

## Draw polygon for each room
Using the rectangle tool, create polygons to map out each room. You can also use the pen tool to edit shapes if there are cutouts, or curved edges. Make sure to fill in the rectangle with a contrasting color so it makes it more visible.

![](/documentation/network_graph_creation/image-1.png)

## Export layers
Before exporting, make sure both layers have a transparent background. Also make sure the image size fits the page. 

For the walls layer, bring the opacity back up to 100%. Hide the png layer. Fill in every shape with white, and add a 0.5mm black stroke to each shape. Export and save it as "\<building code, floor number\>.png" (e.g. "H.png" for Hall building), and save it under `/mobile/data/buildings/<building code>` (e.g. `/mobile/data/buildings/H/H9.png`).

For the png layer, simply export the layer as is. Save it anywhere temporary because we'll be discarding it later.

# Creating the Navigation Graph
## Using the Navigation Graph Editor
Open up the editor (`graph_editor.html`) in your browser. Start by loading in the png layer you just exported. 
**Very important** Set the "Bldg" to be the building code (e.g. Hall would be "H"), and set the floor number to the current floor number you're editing.
![](/documentation/network_graph_creation/image-2.png)

## Create the Room-Door Network
Begin by adding nodes for each room, preferably at the center of the polygon. Follow by adding doors for every room and anywhere you see a door symbol. Connect up each room to its door.

![](/documentation/network_graph_creation/image-3.png)

**Very important** Add a label to each Room node with the room number (e.g. 901)

## Complete the Network
Follow by adding the rest of the nodes. This includes stairway landings (escalators count), elevator doors, and any building entry/exit. Once that's done, add hallway waypoints that will help create a navigable hallway path. A good place to add a hallway waypoint is in front of a door, in the middle of the hallway (as noted by the yellow nodes in the image below)

![](/documentation/network_graph_creation/image-4.png)

Once all the way points are created, it's time to connect everything together. Once you are done, you should be left with something like the image below.

![](/documentation/network_graph_creation/image-5.png)

## Clean up the Network (optional)
Optionally, you can finish off by loading in the walls png layer we exported earlier into the editor. This will give you a cleaner view and allow you to polish up the graph by moving some nodes closer to the polygon walls.

![](/documentation/network_graph_creation/image-6.png)

## Export JSON
Once the network is complete, you can export it to JSON by hitting the Export icon in the toolbar. Save this file as "\<building code, floor number\>-nav.png" (e.g. "H9-nav.png"). Save it under `/mobile/data/buildings/<building code>` (e.g. `/mobile/data/buildings/H/H9.png`).