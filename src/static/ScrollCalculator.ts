import $ = require('jquery');

export interface DisplayBoundaries {
    displayStart: number,
    displayEnd: number
}

export class ScrollCalculator {
    static computeDisplayBoundaries(rowHeight:string, viewport:JQuery, canvas:JQuery):DisplayBoundaries {
        var displayStart = 0, displayEnd = 20;
        if( viewport.offset() && canvas.offset() ) {
            const viewportOffset = viewport.offset().top;
            const canvasOffset = canvas.offset().top;
            const progress = viewportOffset - canvasOffset;
            var displayStart = Math.floor(progress / parseInt(rowHeight));
            var tableHeight:number = viewport[0].style.maxHeight ? parseInt(viewport[0].style.maxHeight) : $(viewport[0]).height();
            displayEnd = displayStart + Math.ceil(tableHeight / parseInt(rowHeight));
        }
        return {
            displayStart,
            displayEnd
        };
    }
}
