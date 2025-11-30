# Project Description

This project explores how online communication data can be manipulated, transcripted and visualized into patterns that guide the crafting process. I extracted my 2-year conversation history with my partner from WeChat, and visualized them to crochet stitches in different heights and types. I analyzed the chat data at two temporal resolutions (week and day) and mapped the corresponding message counts to different stitch types, each with varying heights. To visualize the data, I generated stitch patterns rendered as customizable shapes, allowing for flexible and expressive crochet designs. Also, the interface allows users to adjust parameters such as stitch color for each sender (for me and my partner), data resolution (day and week), and the visualization's starting date.

In developing this project, I consulted ChatGPT and Copilot quite frequently to get suggestions, explore different solutions and debug. I also explored how to write javascript in modules mode.

# Inspiration

My inspiration for this project stems from Audrey Desjardins’s autobiographical work, in which she transformed everyday sound data into textured 3D-printed clay cups (https://doi.org/10.1145/3322276.3323694). However, unlike clay-based 3D printing, crafting an object stitch by stitch through crochet is a slow, embodied, and manually engaged process. Building on their findings, I am curious about how hand fabrication process may shape the data's materiality, tactility and story telling.

I chose yarn-based craft and crochet because ropes and knots inherently evoke metaphors of connection and relationality between people. Crochet’s flexibility allows data to be transformed into diverse physical forms that can be situated within various everyday contexts. Its line-based construction and diverse stitch characteristics also make it suitable for expressing data patterns like histograms.

# Data

## Acquisition

Due to platform limitations, exporting conversation data directly from WeChat is not easy. I eventually used the software "Louyue" to extract the data. The exported dataset contains three columns: Time, Sender, and Content. In Content column, video/audio calls, emojis, and images are tagged by "[]". However, the actual visual content of images and emojis, as well as the duration of calls, are not displayed.

## Cleaning

I filtered the dataset to retain text messages and the occurrence counts of video/audio calls.

## Parsing and Aggregation

The Time column was seperated into year, month, day, hour, and minute. Based on the selected temporal resolution (day or week), the data was grouped into corresponding bins to compute message and call counts.

## Representation

The mapping rules translate data into crochet parameters.
Message counts: stitch type in different height.
Video/audio call counts: picot stitches of different length.

# Interaction

- Hold and drag the mouse to draw data into stitches. Users can draw any shape or structures as they want. 

- Use the sliders to adjust yarn colors, including the hue assigned to each sender and the overall brightness.

- Choose between daily or weekly resolution, where each stitch represents either one day or one week of data.

- Set the starting point of the data visualization and view the remaining data available for stitching.

- hover on a stitch to see the detailed information.

# Fabrication and Reflection

I drew the conversation data using the weekly resolution and shaped it into a Christmas tree pattern. Based on this design, I manually crocheted the piece using three kinds of yarns in around one hour. To better distinguish each row, I added additional lines using white yarn between two data lines. 

Crafting data manually allows me to experience it in detail and at a high resolution. By sequentially crocheting through the timeline, I can recall every time period in order and understand the unique meaning hidden behind each stitch. In addition, I tend to highlight more on the special dates. For example, I would drag more yarn to make the variation in stitch height more niticeable where the data shows the time when we first met and exchange a lot of messages. If some shorter picots were hidden within the surrounding stitches, I would manually adjust them to make them pop up and become more visible.

Compared to IoT data, online conversation history is more intimate and emotionally meaningful. Thus, artefacts created from such data is not merely everyday objects, but act as souvenirs or momentums. Initially, I intended the crochet piece to serve as a cup coaster for daily use. However, once I realized how much personal meaning is embedded in the physical structure, such as those pop-up stitches, I began to worry that placing a cup on it might flatten the elevated stitches and erase their symbolic meaning. In this sense, the data is making the object more vulnerable. 

Moreover, the data shapes the artefact’s affordance. The tactile texture of the crochet surface invites human touch rather than acting as a passive surface for other objects. It naturally encourages holding, touching, or even wearing, rather than being placed beneath something. In this way, the material expression of data subtly directs how the object should be interacted with.

<img width="336" height="481" alt="62b8535bfc23b59284c0a15dc5fd9dd2 1" src="https://github.com/user-attachments/assets/01505ca1-bef2-47a3-bb89-87a1b50284b6" />


